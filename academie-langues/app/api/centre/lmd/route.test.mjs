import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { emptyAcademicCase } from "../../../utils/lmd-academic.ts";

const url = code => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const compile = file => ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const imports = {
  "next/server": url('export const NextResponse = { json: (data, init) => Response.json(data, init) };'),
  "@/app/utils/center-auth-server": url(`
    const f = () => globalThis.__lmdApiTest;
    export const getCenterStaffContext = async () => ({ ctx: f().ctx, error: null });
    export const requireCenterPermission = async () => null;
    export const campusAllowed = (id, allowed) => !allowed || allowed.includes(id);
    export const supabaseAdmin = {
      from(table) {
        const call = { table, args: [] }; f().calls.push(call);
        const chain = new Proxy({}, { get: (_, key) => {
          if (key === 'then') return (resolve, reject) => Promise.resolve(f().query(table, call)).then(resolve, reject);
          return (...args) => { call.args.push([key, ...args]); return chain; };
        }});
        return chain;
      },
      rpc: async (name, args) => { f().calls.push({ rpc: name, args }); return f().rpcResult || { data: { revision: 1 }, error: null }; }
    };`),
  "@/app/utils/lmd-progress.server": url('export const loadLmdProgress = async () => globalThis.__lmdApiTest.progress; export const loadOptionalUeInscriptions = async () => ({ optionalUes: [], selectedUeIds: [] });'),
  "@/app/utils/lmd-credits": url('export const resolveLmdValidationThreshold = value => value ?? 50;'),
  "@/app/utils/lmd-academic": url(compile(new URL('../../../utils/lmd-academic.ts', import.meta.url))),
};
let source = compile(new URL('./route.ts', import.meta.url));
for (const [name, replacement] of Object.entries(imports)) source = source.replaceAll(`from "${name}"`, `from "${replacement}"`);
const { POST } = await import(url(source));
function fixture() {
  const value = {
    ctx: { user: { id: "manager" }, centerId: "center", centerType: "universite", role: "center_manager", scopedCampusIds: null },
    source: { id: "e", student_id: "student", filiere_id: "program", niveau_id: "n1", semestre_id: "s1", campus_id: "campus", status: "active", filieres: { center_id: "center", type: "cursus", name: "Informatique" } },
    progress: { complete: true, acquiredCredits: 6, totalCredits: 6, results: [{ id: "ue" }], debts: [], semesters: [{ id: "s2", niveau_id: "n1" }] },
    calls: [],
    query(table) { return { data: table === "enrollments" ? this.source : table === "centers" ? { name: "Université", lmd_validation_threshold_pct: 50 } : table === "profiles" ? { prenom: "A", nom: "B", matricule: "001" } : null, error: null }; },
  };
  globalThis.__lmdApiTest = value;
  return value;
}
const post = body => POST(new Request('http://localhost/api/centre/lmd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrollment_id: "e", revision: 0, dossier: emptyAcademicCase, ...body }) }));

test("foreign center and campus are rejected before loading or changing the record", async () => {
  let f = fixture(); f.source.filieres.center_id = "other";
  assert.equal((await post({ action: "save" })).status, 403);
  assert.equal(f.calls.some(c => c.rpc), false);
  f = fixture(); f.ctx.scopedCampusIds = ["other-campus"];
  assert.equal((await post({ action: "save" })).status, 403);
});
test("a teacher cannot issue a diploma, even with all credits", async () => {
  const f = fixture(); f.ctx.role = "trainer";
  assert.equal((await post({ action: "issue", confirm: true })).status, 403);
  assert.equal(f.calls.some(c => c.rpc), false);
});
test("diploma requires explicit confirmation and server-verified credits", async () => {
  const f = fixture();
  assert.equal((await post({ action: "issue" })).status, 400);
  f.progress.complete = false;
  assert.equal((await post({ action: "issue", confirm: true })).status, 400);
  assert.equal(f.calls.some(c => c.rpc), false);
});
test("issued diploma takes identity and credits from the server, not the request", async () => {
  const f = fixture();
  assert.equal((await post({ action: "issue", confirm: true, studentName: "FORGED", totalCredits: 999 })).status, 200);
  const call = f.calls.find(c => c.rpc);
  assert.equal(call.args.p_diploma.studentName, "A B");
  assert.equal(call.args.p_diploma.totalCredits, 6);
  assert.equal(call.args.p_actor, "manager");
});
test("stale academic revision is a conflict, not an overwrite", async () => {
  const f = fixture(); f.rpcResult = { error: { message: "REVISION_CONFLICT" } };
  assert.equal((await post({ action: "save" })).status, 409);
});
test("semester outside current level and unrelated recovery UE are rejected", async () => {
  const f = fixture();
  assert.equal((await post({ action: "semester", semestre_id: "outside" })).status, 400);
  assert.equal((await post({ action: "recover", ue_id: "other", score: 20 })).status, 400);
  assert.equal(f.calls.some(c => c.rpc), false);
});
test("changing semester does not create an enrollment or charge tuition", async () => {
  const f = fixture();
  assert.equal((await post({ action: "semester", semestre_id: "s2" })).status, 200);
  const updates = f.calls.flatMap(c => c.args || []).filter(args => args[0] === "update");
  assert.deepEqual(updates, [["update", { semestre_id: "s2", groupe_id: null }]]);
  assert.equal(f.calls.some(c => c.rpc), false);
});
