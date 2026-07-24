import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sendPushToUsers } from "@/app/utils/push-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UNLIMITED = 9999;

function canAccess(role: string | null, permissions: string[], permission: string) {
  if (permission === "support") return role !== "staff" || permissions.includes("support") || permissions.includes("returns");
  return role !== "staff" || permissions.includes(permission);
}

function forbidden() {
  return NextResponse.json({ error: "Module non autorise pour ce formateur." }, { status: 403 });
}

function sessionToIso(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).toISOString();
}

function normalizeStatus(status: string) {
  if (status === "confirme") return "confirmed";
  if (status === "refuse") return "refused";
  if (status === "annule") return "cancelled";
  if (status === "effectue") return "effectue";
  return "pending";
}

function normalizeSession(session: any) {
  return {
    ...session,
    scheduled_at: sessionToIso(session.session_date, session.session_time),
    status: normalizeStatus(session.status),
  };
}

async function getCenterForUser(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, centerId: null, role: null, permissions: [], response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };

  const { data: membership } = await supabaseAdmin
    .from("center_users")
    .select("center_id, role, permissions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.center_id) {
    return { user: null, centerId: null, role: null, permissions: [], response: NextResponse.json({ error: "Compte centre requis." }, { status: 403 }) };
  }

  return {
    user,
    centerId: membership.center_id as string,
    role: membership.role as string,
    permissions: (membership.permissions || []) as string[],
    response: null,
  };
}

export async function GET(req: Request) {
  try {
    const { user, centerId, role, permissions, response } = await getCenterForUser(req);
    if (response) return response;

    const { data: students, error: studentsError } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, email, phone, ville, current_activity, last_seen_at, last_sign_in_at, simulations_completed, created_at, tag_status, pack_name, coaching_total, coaching_used")
      .eq("center_id", centerId)
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

    const studentIds = (students || []).map((student: any) => student.id);
    const { data: supportMessages } = await supabaseAdmin
      .from("support_messages")
      .select("*")
      .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
      .order("created_at", { ascending: true })
      .limit(100);
    if (studentIds.length === 0) {
      return NextResponse.json({
        students: [],
        missions: [],
        submissions: [],
        coaching: [],
        messages: [],
        communityMessages: [],
        feedbacks: [],
        userFeedbacks: [],
        supportMessages: canAccess(role, permissions, "support") ? supportMessages || [] : [],
      });
    }

  const [missionsRes, submissionsRes, coachingRes, messagesFromRes, messagesToRes, communityRes, feedbackRes, userFeedbackRes] = await Promise.all([
    supabaseAdmin.from("missions").select("*").eq("center_id", centerId).order("created_at", { ascending: false }).limit(50),
    supabaseAdmin.from("mission_submissions").select("*").in("user_id", studentIds).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("coaching_sessions").select("*").in("user_id", studentIds).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("private_messages").select("*").eq("center_id", centerId).in("from_user_id", studentIds).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("private_messages").select("*").eq("center_id", centerId).in("to_user_id", studentIds).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("community_messages").select("*").eq("center_id", centerId).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("feedback").select("*").in("user_id", studentIds).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("user_feedbacks").select("*").in("user_id", studentIds).order("created_at", { ascending: false }).limit(100),
  ]);

  const studentMap: Record<string, any> = {};
  (students || []).forEach((student: any) => { studentMap[student.id] = student; });

  const missionIds = [...new Set((submissionsRes.data || []).map((submission: any) => submission.mission_id).filter(Boolean))];
  const missionDetailsRes = missionIds.length
    ? await supabaseAdmin.from("missions").select("id, title, description").in("id", missionIds)
    : { data: [] as any[] };
  const missionMap: Record<string, any> = {};
  (missionDetailsRes.data || []).forEach((mission: any) => { missionMap[mission.id] = mission; });

  const submissions = (submissionsRes.data || []).map((submission: any) => ({
    ...submission,
    profiles: studentMap[submission.user_id] || null,
    missions: missionMap[submission.mission_id] || null,
  }));

  const coaching = (coachingRes.data || [])
    .map((session: any) => normalizeSession({
      ...session,
      profiles: studentMap[session.user_id] || null,
    }))
    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const messages = [...(messagesFromRes.data || []), ...(messagesToRes.data || [])]
    .filter((message, index, list) => list.findIndex((item) => item.id === message.id) === index)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((message: any) => ({
      ...message,
      from_profile: studentMap[message.from_user_id] || null,
      to_profile: studentMap[message.to_user_id] || null,
    }));

  const communityMessages = (communityRes.data || []).map((message: any) => ({
    ...message,
    profiles: studentMap[message.user_id] || null,
  }));

  const feedbacks = (feedbackRes.data || []).map((feedback: any) => ({
    ...feedback,
    profiles: studentMap[feedback.user_id] || null,
  }));

  const userFeedbacks = (userFeedbackRes.data || []).map((feedback: any) => ({
    ...feedback,
    profiles: studentMap[feedback.user_id] || null,
  }));

    return NextResponse.json({
      students: canAccess(role, permissions, "students") ? students : [],
      missions: canAccess(role, permissions, "missions") ? missionsRes.data || [] : [],
      submissions: canAccess(role, permissions, "missions") || canAccess(role, permissions, "submissions") ? submissions : [],
      coaching: canAccess(role, permissions, "coaching") ? coaching : [],
      messages: canAccess(role, permissions, "messages") ? messages : [],
      communityMessages: canAccess(role, permissions, "forum") ? communityMessages : [],
      feedbacks: canAccess(role, permissions, "reviews") ? feedbacks : [],
      userFeedbacks: canAccess(role, permissions, "returns") ? userFeedbacks : [],
      supportMessages: canAccess(role, permissions, "support") ? supportMessages || [] : [],
    });
  } catch (error: any) {
    console.error("center admin-data GET fatal:", error);
    return NextResponse.json({ error: error?.message || "Erreur serveur admin centre." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, centerId, role, permissions, response } = await getCenterForUser(req);
    if (response) return response;

    const body = await req.json();
    const { action } = body;

  const { data: students } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("center_id", centerId)
    .eq("role", "student");
  const studentIds = (students || []).map((student: any) => student.id);

  if (action === "mission") {
    if (!canAccess(role, permissions, "missions")) return forbidden();
    if (!centerId) {
      return NextResponse.json({ error: "Centre introuvable pour cette mission." }, { status: 403 });
    }
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const target = String(body.target || "all");
    const targetUserId = target === "student" ? String(body.targetUserId || "") : "";
    if (!title) return NextResponse.json({ error: "Le titre est requis." }, { status: 400 });
    if (target === "student" && !studentIds.includes(targetUserId)) {
      return NextResponse.json({ error: "Etudiant hors centre." }, { status: 403 });
    }

    const { data: mission, error } = await supabaseAdmin
      .from("missions")
      .insert({
        title,
        description,
        center_id: centerId,
        target_user_id: targetUserId || null,
        created_by_center_user_id: user!.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let targetStudents = students || [];
    if (target === "student") targetStudents = targetStudents.filter((student: any) => student.id === targetUserId);

    if (targetStudents.length > 0) {
      await supabaseAdmin.from("notifications").insert(
        targetStudents.map((student: any) => ({ user_id: student.id, message: `Nouvelle mission assignee : ${title}` }))
      );
      await sendPushToUsers(targetStudents.map((student: any) => student.id), {
        title: "Nouvelle mission",
        body: title,
        url: "/centre/student/missions",
      });
    }

    return NextResponse.json({ mission, notified: targetStudents.length });
  }

  if (action === "delete_mission") {
    if (!canAccess(role, permissions, "missions")) return forbidden();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
    const { error } = await supabaseAdmin.from("missions").delete().eq("id", id).eq("center_id", centerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "push") {
    if (!canAccess(role, permissions, "push")) return forbidden();
    const title = String(body.title || "").trim();
    const pushBody = String(body.body || body.message || "").trim();
    const url = String(body.url || "/centre/student/dashboard").trim() || "/centre/student/dashboard";
    if (!title || !pushBody) return NextResponse.json({ error: "Titre et message requis." }, { status: 400 });

    const targetIds = body.targetUserId && studentIds.includes(body.targetUserId)
      ? [body.targetUserId]
      : studentIds;

    await Promise.all(targetIds.map((userId: string) =>
      supabaseAdmin.from("notifications").insert({ user_id: userId, message: pushBody })
    ));
    const result = await sendPushToUsers(targetIds, { title, body: pushBody, url });
    return NextResponse.json({
      sent: result?.sent ?? targetIds.length,
      total: result?.total ?? targetIds.length,
      targets: targetIds.length,
    });
  }

  if (action === "support_message") {
    if (!canAccess(role, permissions, "support")) return forbidden();
    const message = String(body.message || "").trim();
    const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    if (!message && !imageUrl) return NextResponse.json({ error: "Message requis." }, { status: 400 });

    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .is("center_id", null)
      .order("created_at", { ascending: true })
      .limit(1);
    if (adminsError) return NextResponse.json({ error: adminsError.message }, { status: 500 });
    const adminId = admins?.[0]?.id;
    if (!adminId) return NextResponse.json({ error: "Aucun admin support disponible." }, { status: 404 });

    const messageWithFallback = imageUrl
      ? `${message}${message ? "\n\n" : ""}Image jointe : ${imageUrl}`
      : message;
    const { data: inserted, error } = await supabaseAdmin
      .from("support_messages")
      .insert({
        from_user_id: user!.id,
        to_user_id: adminId,
        message: messageWithFallback,
        image_url: imageUrl,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: inserted });
  }

  if (action === "private_message") {
    if (!canAccess(role, permissions, "messages")) return forbidden();
    const toUserId = String(body.toUserId || "");
    const message = String(body.message || "").trim();
    if (!studentIds.includes(toUserId)) return NextResponse.json({ error: "Etudiant hors centre." }, { status: 403 });
    if (!message) return NextResponse.json({ error: "Message requis." }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("private_messages")
      .insert({ from_user_id: user!.id, to_user_id: toUserId, message, center_id: centerId })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
  }

  if (action === "delete_community_message") {
    if (!canAccess(role, permissions, "forum")) return forbidden();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
    const { error } = await supabaseAdmin
      .from("community_messages")
      .delete()
      .eq("id", id)
      .eq("center_id", centerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "pin_feedback") {
    if (!canAccess(role, permissions, "reviews")) return forbidden();
    const id = String(body.id || "");
    const pinned = !!body.pinned;
    if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
    if (studentIds.length === 0) return NextResponse.json({ error: "Aucun etudiant dans ce centre." }, { status: 404 });
    const { error } = await supabaseAdmin
      .from("feedback")
      .update({ pinned })
      .eq("id", id)
      .in("user_id", studentIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_feedback") {
    if (!canAccess(role, permissions, "reviews")) return forbidden();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
    if (studentIds.length === 0) return NextResponse.json({ error: "Aucun etudiant dans ce centre." }, { status: 404 });
    const { error } = await supabaseAdmin
      .from("feedback")
      .delete()
      .eq("id", id)
      .in("user_id", studentIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "submission_comment") {
    if (!canAccess(role, permissions, "missions") && !canAccess(role, permissions, "submissions")) return forbidden();
    const submissionId = String(body.submissionId || "");
    const comment = String(body.comment || "").trim();

    if (!submissionId || !comment) {
      return NextResponse.json({ error: "Commentaire requis." }, { status: 400 });
    }

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("mission_submissions")
      .select("id, user_id, mission_id")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) return NextResponse.json({ error: submissionError.message }, { status: 500 });
    if (!submission || !studentIds.includes(submission.user_id)) {
      return NextResponse.json({ error: "Soumission hors centre." }, { status: 403 });
    }

    const { data: mission } = submission.mission_id
      ? await supabaseAdmin.from("missions").select("title").eq("id", submission.mission_id).eq("center_id", centerId).maybeSingle()
      : { data: null };

    if (submission.mission_id && !mission) {
      return NextResponse.json({ error: "Mission hors centre." }, { status: 403 });
    }

    const commentedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("mission_submissions")
      .update({ admin_comment: comment, admin_comment_at: commentedAt })
      .eq("id", submissionId);

    if (updateError) {
      return NextResponse.json(
        {
          error: updateError.message,
          hint: "Ajoute les colonnes admin_comment et admin_comment_at sur mission_submissions.",
        },
        { status: 500 }
      );
    }

    const title = mission?.title ? ` sur "${mission.title}"` : "";
    await supabaseAdmin.from("notifications").insert({
      user_id: submission.user_id,
      message: `Nouveau commentaire du centre${title} : ${comment}`,
    });

    await sendPushToUsers([submission.user_id], {
      title: "Nouveau commentaire",
      body: mission?.title ? `Commentaire sur ${mission.title}` : "Votre centre a commente votre soumission.",
      url: "/centre/student/missions",
    });

    return NextResponse.json({ ok: true, comment, admin_comment_at: commentedAt });
  }

  if (action === "coaching_decision") {
    if (!canAccess(role, permissions, "coaching")) return forbidden();
    const id = String(body.id || "");
    const status = String(body.status || "");
    const adminNote = String(body.admin_note || "").trim();

    if (!id || !["confirmed", "refused", "cancelled", "effectue"].includes(status)) {
      return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    }

    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("coaching_sessions")
      .select("*, profiles:user_id(id, prenom, email, coaching_total, coaching_used)")
      .eq("id", id)
      .maybeSingle();

    if (appointmentError) return NextResponse.json({ error: appointmentError.message }, { status: 500 });
    if (!appointment || !studentIds.includes(appointment.user_id)) {
      return NextResponse.json({ error: "Rendez-vous hors centre." }, { status: 403 });
    }

    const isPast = new Date(sessionToIso(appointment.session_date, appointment.session_time)).getTime() < Date.now();
    if (status !== "effectue" && isPast) {
      return NextResponse.json({ error: "Ce rendez-vous est deja passe." }, { status: 409 });
    }

    if (status === "effectue") {
      if (appointment.status !== "confirme") {
        return NextResponse.json({ error: "Seuls les rendez-vous confirmes peuvent etre marques effectues." }, { status: 409 });
      }
      const { data: updated, error } = await supabaseAdmin
        .from("coaching_sessions")
        .update({ status: "effectue" })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ appointment: normalizeSession(updated) });
    }

    if (status === "cancelled") {
      if (appointment.status !== "confirme") {
        return NextResponse.json({ error: "Seuls les rendez-vous confirmes peuvent etre annules." }, { status: 409 });
      }
      const used = appointment.profiles?.coaching_used ?? 0;
      const total = appointment.profiles?.coaching_total ?? 0;
      if (total !== UNLIMITED && used > 0) {
        await supabaseAdmin.from("profiles").update({ coaching_used: used - 1 }).eq("id", appointment.user_id);
      }
    } else {
      if (appointment.status !== "en_attente") {
        return NextResponse.json({ error: "Ce rendez-vous a deja ete traite." }, { status: 409 });
      }
      if (status === "confirmed") {
        const used = appointment.profiles?.coaching_used ?? 0;
        const total = appointment.profiles?.coaching_total ?? 0;
        if (total !== UNLIMITED && used >= total) {
          return NextResponse.json({ error: "Quota coaching epuise pour cet etudiant." }, { status: 409 });
        }
        if (total !== UNLIMITED) {
          await supabaseAdmin.from("profiles").update({ coaching_used: used + 1 }).eq("id", appointment.user_id);
        }
      }
    }

    const dbStatus = status === "confirmed" ? "confirme" : "annule";
    const { data: updated, error } = await supabaseAdmin
      .from("coaching_sessions")
      .update({ status: dbStatus })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const when = new Date(sessionToIso(appointment.session_date, appointment.session_time)).toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Douala",
    });
    const notificationMessage =
      status === "confirmed"
        ? `Votre rendez-vous de coaching du ${when} est confirme.`
        : status === "refused"
          ? `Votre demande de coaching du ${when} a ete refusee.${adminNote ? ` Motif : ${adminNote}` : ""}`
          : `Votre rendez-vous de coaching du ${when} a ete annule par votre centre.${adminNote ? ` Motif : ${adminNote}` : ""}`;

    await supabaseAdmin.from("notifications").insert({ user_id: appointment.user_id, message: notificationMessage });
    await sendPushToUsers([appointment.user_id], {
      title: status === "confirmed" ? "Coaching confirme" : status === "refused" ? "Coaching refuse" : "Coaching annule",
      body: notificationMessage,
      url: "/centre/student/coaching",
    });

    return NextResponse.json({ appointment: normalizeSession(updated) });
  }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error: any) {
    console.error("center admin-data POST fatal:", error);
    return NextResponse.json({ error: error?.message || "Erreur serveur admin centre." }, { status: 500 });
  }
}
