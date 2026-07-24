import { CoursModule, QuizQuestion } from "./cours_semaine1";

export const coursSemaine3: CoursModule[] = [
  {
    id: 7,
    titre: "MODULE I : LA MAÎTRISE DES ACCORDS",
    duree: "30 min",
    description: "Éviter les fautes d'inattention et maîtriser les règles complexes pour maximiser le score.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">LA MAÎTRISE DES ACCORDS EN FRANÇAIS</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Éviter les fautes d'inattention et maîtriser les règles complexes pour maximiser le score en expression écrite.</p>

        <div class="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-sm">
          <p class="font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm">🎯 Ce module couvre :</p>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3 font-medium text-sm">
            <li class="flex items-center gap-2">📌 L'accord du groupe nominal</li>
            <li class="flex items-center gap-2">📌 L'accord sujet-verbe</li>
            <li class="flex items-center gap-2">📌 Le participe passé (être/avoir)</li>
            <li class="flex items-center gap-2">📌 Les accords particuliers C1/C2</li>
            <li class="flex items-center gap-2">📌 Les adjectifs de couleur composés</li>
            <li class="flex items-center gap-2">📌 Le participe passé + infinitif</li>
            <li class="flex items-center gap-2">📌 L'accord avec "Le peu de"</li>
            <li class="flex items-center gap-2">📌 L'accord de "Même"</li>
          </ul>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">1. L'Accord de Base : Le Groupe Nominal</h4>
        <p class="mb-4">C'est la règle fondamentale : l'adjectif qualificatif et le déterminant s'accordent en genre et en nombre avec le nom qu'ils rapportent.</p>

        <div class="space-y-3 mb-8">
          <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
            <p class="font-bold text-blue-900 mb-2">Règle générale</p>
            <p class="text-sm text-blue-800">Un nom féminin pluriel entraîne un adjectif au féminin pluriel.</p>
            <div class="bg-white p-3 rounded-lg border border-blue-100 mt-2">
              <p class="text-sm italic text-blue-700">"Une réponse précise" → "Des réponses <strong>précises</strong>"</p>
            </div>
          </div>
          <div class="bg-amber-50 p-5 rounded-xl border border-amber-200">
            <p class="font-bold text-amber-900 mb-2">⚠️ Cas particuliers pour le TCF</p>
            <ul class="space-y-2 text-sm text-amber-800">
              <li>• <strong>Adjectifs de couleur</strong> : S'accordent (bleus, vertes), sauf s'ils proviennent d'un nom (<em>marron, orange</em>) ou s'ils sont composés (<em>bleu foncé</em>).</li>
              <li>• <strong>Avec "gens"</strong> : "des gens heureux" (masculin), mais "les bonnes gens" (féminin si l'adjectif précède).</li>
            </ul>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">2. L'Accord du Sujet et du Verbe</h4>
        <p class="mb-4">Le verbe s'accorde toujours avec son sujet, attention aux pièges de structure de phrase.</p>

        <div class="space-y-3 mb-8">
          <div class="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <span class="font-black text-orange-500 shrink-0">①</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Sujets multiples → pluriel</p>
              <p class="text-sm text-slate-600 italic">"Le candidat et son professeur <strong>discutent</strong>."</p>
            </div>
          </div>
          <div class="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <span class="font-black text-orange-500 shrink-0">②</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Sujet éloigné → accord avec le vrai sujet</p>
              <p class="text-sm text-slate-600 italic">"La liste des documents demandés par les services d'immigration <strong>est</strong> longue." (accord avec "la liste", pas "services")</p>
            </div>
          </div>
          <div class="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <span class="font-black text-orange-500 shrink-0">③</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Le pronom "On" → toujours 3ème personne singulier</p>
              <p class="text-sm text-slate-600 italic">"On <strong>est</strong> partis tôt." (mais l'adjectif peut s'accorder au pluriel si "on" = "nous")</p>
            </div>
          </div>
          <div class="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <span class="font-black text-orange-500 shrink-0">④</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Collectifs (une foule de, une majorité de) → les deux sont acceptés</p>
              <p class="text-sm text-slate-600 italic">"Une majorité de candidats <strong>a réussi</strong>" ou "<strong>ont réussi</strong>".</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">3. L'Accord du Participe Passé <span class="text-orange-500 text-base font-bold">(Point critique)</span></h4>
        <p class="mb-5">C'est ici que se perdent souvent les points précieux au TCF.</p>

        <div class="grid md:grid-cols-3 gap-4 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-2">A. Avec "Être"</p>
            <p class="text-sm text-blue-800 mb-3">Le participe passé s'accorde avec le <strong>sujet</strong>.</p>
            <div class="space-y-1">
              <p class="text-xs italic text-blue-700 bg-white p-2 rounded-lg border border-blue-100">"Elle est <strong>allée</strong> à l'ambassade."</p>
              <p class="text-xs italic text-blue-700 bg-white p-2 rounded-lg border border-blue-100">"Ils sont <strong>arrivés</strong> à Montréal."</p>
            </div>
          </div>
          <div class="bg-orange-50 p-5 rounded-2xl border border-orange-200">
            <p class="font-black text-orange-900 mb-2">B. Avec "Avoir"</p>
            <p class="text-sm text-orange-800 mb-3"><strong>Règle d'or :</strong> accord avec le COD uniquement s'il est placé <strong>avant</strong> le verbe.</p>
            <div class="space-y-1">
              <p class="text-xs text-orange-700 bg-white p-2 rounded-lg border border-orange-100">❌ "J'ai mangé des pommes." (COD après = pas d'accord)</p>
              <p class="text-xs text-orange-700 bg-white p-2 rounded-lg border border-orange-100">✅ "Les pommes que j'ai <strong>mangées</strong>." (COD avant = accord)</p>
            </div>
          </div>
          <div class="bg-purple-50 p-5 rounded-2xl border border-purple-200">
            <p class="font-black text-purple-900 mb-2">C. Verbes Pronominaux</p>
            <p class="text-sm text-purple-800 mb-3">Accord avec le sujet si le sujet fait l'action sur lui-même.</p>
            <div class="space-y-1">
              <p class="text-xs text-purple-700 bg-white p-2 rounded-lg border border-purple-100">✅ "Elle s'est <strong>lavée</strong>."</p>
              <p class="text-xs text-purple-700 bg-white p-2 rounded-lg border border-purple-100">❌ "Elle s'est lavé les mains." (COD "mains" après = pas d'accord)</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">4. Les Accords Particuliers <span class="text-orange-500 text-base font-bold">(Niveau C1/C2)</span></h4>

        <div class="space-y-3 mb-8">
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-2">Le participe passé des verbes impersonnels → toujours invariable</p>
            <p class="text-sm text-slate-600 italic">"La chaleur qu'il a <strong>fait</strong> cet été." <span class="not-italic text-slate-400">(On ne dit pas "faite")</span></p>
          </div>
          <div class="bg-amber-50 p-5 rounded-xl border border-amber-200">
            <p class="font-bold text-amber-900 mb-2">"Tout", une règle subtile</p>
            <p class="text-sm text-amber-800 mb-2">Adverbe normalement invariable, <strong>sauf</strong> devant un adjectif féminin commençant par une consonne ou un 'h' aspiré.</p>
            <div class="grid md:grid-cols-2 gap-2">
              <p class="text-xs italic text-amber-700 bg-white p-2 rounded-lg border border-amber-100">✅ "Elle est <strong>tout</strong> étonnée." (voyelle → invariable)</p>
              <p class="text-xs italic text-amber-700 bg-white p-2 rounded-lg border border-amber-100">✅ "Elle est <strong>toute</strong> honteuse." (consonne/h aspiré → accord)</p>
            </div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-2">"Nu" et "Demi", position déterminante</p>
            <ul class="text-sm text-slate-600 space-y-1">
              <li>• <strong>Avant le nom</strong> (relié par un trait d'union) → invariable : "une <strong>demi-</strong>heure"</li>
              <li>• <strong>Après le nom</strong> → accordé : "deux heures et <strong>demie</strong>"</li>
            </ul>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">5. L'Accord des Adjectifs de Couleur Composés</h4>
        <div class="bg-red-50 border border-red-200 p-5 rounded-xl mb-8">
          <p class="font-bold text-red-900 mb-2">La règle : dès qu'une couleur est composée de deux mots → totalement invariable</p>
          <div class="grid md:grid-cols-2 gap-2 mt-2">
            <p class="text-sm italic text-red-800 bg-white p-3 rounded-lg border border-red-100">"Des chemises <strong>bleu clair</strong>" <span class="not-italic text-slate-400">(pas de 's')</span></p>
            <p class="text-sm italic text-red-800 bg-white p-3 rounded-lg border border-red-100">"Des yeux <strong>vert pomme</strong>" <span class="not-italic text-slate-400">(pas de 's')</span></p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">6. Le Participe Passé suivi d'un Infinitif</h4>
        <p class="mb-4">Très fréquent dans les récits d'expériences professionnelles.</p>
        <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-4">
          <p class="font-bold text-slate-800 mb-3">La règle : accord avec le COD précédent <strong>uniquement si le COD fait l'action</strong> exprimée par l'infinitif.</p>
          <div class="grid md:grid-cols-2 gap-3">
            <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <p class="text-xs font-bold text-emerald-700 mb-1">✅ Accord</p>
              <p class="text-sm italic text-emerald-800">"Les musiciens que j'ai <strong>entendus</strong> jouer." <span class="not-italic text-xs text-emerald-600">(les musiciens jouent)</span></p>
            </div>
            <div class="bg-slate-100 p-3 rounded-lg border border-slate-200">
              <p class="text-xs font-bold text-slate-600 mb-1">❌ Invariable</p>
              <p class="text-sm italic text-slate-700">"La chanson que j'ai <strong>entendu</strong> chanter." <span class="not-italic text-xs text-slate-500">(la chanson ne chante pas)</span></p>
            </div>
          </div>
        </div>
        <div class="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-8">
          <p class="font-bold text-orange-900 mb-1">Cas particulier : verbe "Faire" → toujours invariable</p>
          <p class="text-sm italic text-orange-800">"La maison qu'il a <strong>fait</strong> construire."</p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">7. L'Accord avec "Le peu de"</h4>
        <div class="grid md:grid-cols-2 gap-4 mb-8">
          <div class="bg-slate-100 p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800 mb-2">Le manque (négatif) → accord avec "le peu"</p>
            <p class="text-sm italic text-slate-700">"Le peu d'affection qu'il a reçu l'a <strong>attristé</strong>." <span class="not-italic text-xs text-slate-500">(c'est le manque qui attriste)</span></p>
          </div>
          <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
            <p class="font-bold text-emerald-800 mb-2">La présence (positif) → accord avec le complément</p>
            <p class="text-sm italic text-emerald-700">"Le peu de conseils qu'il a <strong>donnés</strong> ont été utiles." <span class="not-italic text-xs text-emerald-600">(on parle des conseils existants)</span></p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">8. L'Accord de l'adjectif avec plusieurs noms</h4>
        <div class="bg-blue-50 p-5 rounded-xl border border-blue-200 mb-8">
          <p class="font-bold text-blue-900 mb-2">La règle : si vous avez un nom masculin et un nom féminin → le masculin l'emporte</p>
          <p class="text-sm italic text-blue-800 mb-3">"Un courage et une détermination <strong>exceptionnels</strong>."</p>
          <div class="bg-white p-3 rounded-lg border border-blue-100">
            <p class="text-xs font-bold text-blue-600 mb-1">💡 Astuce TCF</p>
            <p class="text-xs text-blue-700">Placez le nom masculin le plus près de l'adjectif pour une sonorité plus naturelle : "Une détermination et un courage <strong>exceptionnels</strong>".</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">9. L'Accord de "Même"</h4>
        <div class="grid md:grid-cols-2 gap-4 mb-8">
          <div class="bg-orange-50 p-5 rounded-xl border border-orange-200">
            <p class="font-bold text-orange-900 mb-2">Adjectif (précédé d'un article) → s'accorde</p>
            <p class="text-sm italic text-orange-800">"Ce sont les <strong>mêmes</strong> problèmes."</p>
          </div>
          <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800 mb-2">Adverbe (signifie "aussi" / "jusqu'à") → invariable</p>
            <p class="text-sm italic text-slate-700">"Ils sont courageux, <strong>même</strong> face au danger."</p>
          </div>
        </div>

        <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
          <h4 class="font-black text-slate-900 mb-4 text-base uppercase tracking-widest">📝 Exercice d'application (Spécial TCF Canada)</h4>
          <p class="text-sm font-medium text-slate-600 mb-4">Corrigez les accords dans les phrases suivantes :</p>
          <ol class="space-y-2 text-sm mb-5">
            <li class="text-slate-700">1. Les efforts que vous avez <em>fourni</em> pour votre immigration sont remarquables.</li>
            <li class="text-slate-700">2. Ils se sont <em>téléphonés</em> hier pour discuter du dossier.</li>
            <li class="text-slate-700">3. Cette candidate semble <em>prêt</em> pour l'examen oral.</li>
            <li class="text-slate-700">4. Une dizaine de postulants <em>sont attendus</em> demain.</li>
          </ol>
          <div class="bg-white border border-emerald-200 rounded-xl p-4">
            <p class="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3">✅ Corrigé</p>
            <ol class="space-y-2 text-sm">
              <li class="text-emerald-800">1. <strong>fournis</strong>, accord avec le COD "efforts" placé avant.</li>
              <li class="text-emerald-800">2. <strong>téléphoné</strong>, invariable : on téléphone <em>à</em> quelqu'un, pas de COD.</li>
              <li class="text-emerald-800">3. <strong>prête</strong>, accord de l'attribut du sujet "candidate".</li>
              <li class="text-emerald-800">4. <strong>est attendue</strong> ou <strong>sont attendus</strong>, les deux sont acceptés avec un nom collectif.</li>
            </ol>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-3 text-lg">✅ Astuces pour réussir au TCF</p>
          <ul class="space-y-2 text-sm text-slate-300">
            <li>✔ Identifier le sujet avant de conjuguer</li>
            <li>✔ Repérer l'auxiliaire (être ou avoir)</li>
            <li>✔ Chercher le COD et sa position</li>
            <li>✔ Lire la phrase lentement au moment de la relecture</li>
          </ul>
          <p class="text-slate-400 text-xs mt-4">Vous avez maintenant toutes les clés pour aborder le TCF Canada avec confiance.</p>
        </div>
      </div>
    `
  },
  {
    id: 8,
    titre: "MODULE II : ARGUMENTER ET NUANCER",
    duree: "25 min",
    description: "L'élégance du C1, Subjonctif, Conditionnel et structures impersonnelles pour argumenter comme un expert.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">ARGUMENTER ET NUANCER</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">L'Élégance du C1, Exprimer non seulement votre opinion, mais aussi des degrés d'incertitude, de nécessité et d'hypothèse.</p>

        <div class="bg-amber-50 border-l-4 border-amber-500 p-5 md:p-6 rounded-r-2xl mb-8">
          <p class="font-bold text-amber-900 mb-2">⚠️ L'erreur la plus fréquente</p>
          <p class="text-amber-800 text-sm md:text-base leading-relaxed">
            Les candidats argumentent uniquement avec des structures simples : <em>"Je pense que... C'est bon... C'est important."</em>
            Le TCF évalue votre capacité à exprimer non seulement votre opinion, mais aussi des degrés d'incertitude, de nécessité et d'hypothèse.
          </p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">1. Le Subjonctif : L'Outil de la Nuance</h4>
        <p class="mb-4">Le Subjonctif est le champion des verbes, il exprime l'incertitude, le doute, la volonté, la nécessité et l'émotion. <strong>Son usage correct est le signe le plus clair du niveau C1.</strong></p>

        <h5 class="text-base font-black text-slate-800 mb-3 uppercase tracking-widest">Les Expressions de la Nécessité et de la Volonté</h5>
        <p class="mb-4 text-sm">Ces structures sont parfaites pour les conclusions et recommandations de la Tâche 3.</p>

        <div class="overflow-x-auto mb-6 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100 text-slate-600 uppercase tracking-widest text-xs">
              <tr><th class="p-4">Structure</th><th class="p-4">Fonction</th><th class="p-4">Exemple</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr>
                <td class="p-4 font-black text-orange-700">Il faut que + Subjonctif</td>
                <td class="p-4">Indispensable (à utiliser avec parcimonie).</td>
                <td class="p-4 italic text-slate-600">"Il faut que nous <strong>prenions</strong> des mesures."</td>
              </tr>
              <tr class="bg-slate-50">
                <td class="p-4 font-black text-orange-700">Il est essentiel que + Subjonctif</td>
                <td class="p-4">Pour insister sur un point clé.</td>
                <td class="p-4 italic text-slate-600">"Il est essentiel que la jeunesse <strong>soit</strong> éduquée."</td>
              </tr>
              <tr>
                <td class="p-4 font-black text-orange-700">Bien que / Quoique + Subjonctif</td>
                <td class="p-4">La Concession.</td>
                <td class="p-4 italic text-slate-600">"Quoique les efforts <strong>soient</strong> louables, ils sont insuffisants."</td>
              </tr>
              <tr class="bg-slate-50">
                <td class="p-4 font-black text-orange-700">À condition que + Subjonctif</td>
                <td class="p-4">Pour poser une réserve.</td>
                <td class="p-4 italic text-slate-600">"J'accepte, à condition que vous <strong>veniez</strong> m'aider."</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bg-red-50 border border-red-200 p-5 rounded-xl mb-6">
          <p class="font-bold text-red-900 mb-3">⚠️ Attention au Doute</p>
          <p class="text-sm text-red-800 mb-3">Le Subjonctif est utilisé après les verbes exprimant le doute :</p>
          <ul class="space-y-1 text-sm text-red-700 mb-4">
            <li>• <em>Je doute que</em> (+ subjonctif)</li>
            <li>• <em>Il n'est pas certain que</em> (+ subjonctif)</li>
          </ul>
          <div class="bg-white p-4 rounded-lg border border-red-100">
            <p class="text-xs font-black text-red-700 uppercase tracking-widest mb-2">🚫 Règle d'or</p>
            <p class="text-sm text-red-800">N'utilisez <strong>JAMAIS</strong> le subjonctif après <em>Je pense que</em> ou <em>Je crois que</em>. Ces deux verbes demandent l'<strong>Indicatif</strong> (sauf à la forme négative ou interrogative).</p>
            <div class="grid md:grid-cols-2 gap-2 mt-3">
              <p class="text-xs bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">✅ "Je pense que c'est vrai." <span class="text-slate-400">(Indicatif)</span></p>
              <p class="text-xs bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">✅ "Je ne pense pas que ce <strong>soit</strong> vrai." <span class="text-slate-400">(Subjonctif à la négative)</span></p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">2. Le Conditionnel : Le Monde de l'Hypothèse</h4>
        <p class="mb-5">Le Conditionnel est indispensable pour émettre des réserves, des suggestions polies ou pour construire des hypothèses.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-2">A. La Suggestion Polie</p>
            <p class="text-sm text-blue-800 mb-3">Pour une lettre formelle (Tâche 2 ou 3), cela remplace avantageusement le ton impératif :</p>
            <div class="space-y-2">
              <div class="bg-white p-3 rounded-lg border border-blue-100">
                <p class="text-xs text-slate-400 mb-1">Au lieu de : "Il faut considérer..."</p>
                <p class="text-sm font-bold text-blue-800">✅ "On <strong>devrait</strong> considérer..."</p>
              </div>
              <div class="bg-white p-3 rounded-lg border border-blue-100">
                <p class="text-xs text-slate-400 mb-1">Au lieu de : "Je suggère de..."</p>
                <p class="text-sm font-bold text-blue-800">✅ "Je <strong>suggérerais</strong> de mettre en place..."</p>
              </div>
            </div>
          </div>
          <div class="bg-purple-50 p-5 rounded-2xl border border-purple-200">
            <p class="font-black text-purple-900 mb-2">B. Le Système d'Hypothèse</p>
            <p class="text-sm text-purple-800 mb-3">Structure de base du niveau B2 pour argumenter sur ce qui pourrait se passer :</p>
            <div class="bg-white p-3 rounded-lg border border-purple-100 mb-3">
              <p class="text-xs font-black text-purple-600 mb-1">SI + IMPARFAIT → CONDITIONNEL PRÉSENT</p>
              <p class="text-sm italic text-purple-800">"Si nous <strong>réduisions</strong> nos dépenses, nous <strong>pourrions</strong> investir davantage."</p>
            </div>
            <div class="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p class="text-xs font-black text-amber-700 mb-1">⭐ Bonus C2, Conditionnel Passé</p>
              <p class="text-xs text-amber-800">Pour exprimer un regret ou une hypothèse non réalisée :</p>
              <p class="text-xs italic text-amber-700 mt-1">"Si j'avais su, j'<strong>aurais voté</strong> différemment."</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">3. Sortir du "Je" (Objectivité et Formalisme)</h4>
        <p class="mb-5">Pour une argumentation solide, cachez votre "Je" derrière des structures impersonnelles.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <p class="font-black text-slate-900 mb-3">Les structures impersonnelles</p>
            <div class="space-y-2 text-sm">
              <div class="bg-white p-3 rounded-lg border border-slate-100">
                <p class="font-bold text-orange-700">Il est nécessaire de + Infinitif</p>
              </div>
              <div class="bg-white p-3 rounded-lg border border-slate-100">
                <p class="font-bold text-orange-700">Il est préférable que + Subjonctif</p>
              </div>
              <div class="bg-white p-3 rounded-lg border border-slate-100">
                <p class="font-bold text-orange-700">Il semblerait que + Indicatif</p>
                <p class="text-xs text-slate-500 mt-1">Pour émettre une information avec prudence.</p>
              </div>
            </div>
          </div>
          <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <p class="font-black text-slate-900 mb-3">La Voix Passive</p>
            <p class="text-sm text-slate-700 mb-3">Elle rend le texte plus académique et objectif.</p>
            <div class="bg-red-50 p-3 rounded-lg border border-red-100 mb-2">
              <p class="text-xs text-red-700">❌ "Le gouvernement <strong>a pris</strong> la décision..."</p>
            </div>
            <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p class="text-xs text-emerald-700">✅ "La décision <strong>a été prise</strong> par le gouvernement..."</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">🛠️ L'atelier pratique : A2 → C1</h4>

        <div class="bg-red-50 p-5 rounded-xl border border-red-200 mb-4">
          <p class="font-bold text-red-800 text-xs uppercase mb-2">Argument A2 (Personnel et Direct) :</p>
          <p class="text-sm italic text-red-900">"Je crois que c'est bien de créer des parcs. Je voudrais que le maire fasse ça. Si le maire fait ça, la ville sera meilleure."</p>
        </div>
        <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-200 mb-8">
          <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Argument C1 (Objectif et Nuancé) :</p>
          <p class="text-sm text-emerald-900 font-medium">"<strong>Il est primordial que</strong> les pouvoirs publics <strong>agissent</strong> rapidement <span class="text-emerald-600">(Nécessité + Subjonctif)</span>. <strong>Force est de constater</strong> que la création d'espaces verts <strong>devrait</strong> être une priorité <span class="text-emerald-600">(Formel + Conditionnel)</span>. <strong>Si</strong> cette mesure <strong>était</strong> adoptée, la qualité de vie des citoyens <strong>serait</strong> grandement améliorée <span class="text-emerald-600">(Hypothèse)</span>."</p>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-2">✅ Vous avez maintenant toutes les clés pour argumenter comme un C1.</p>
          <p class="text-slate-300 text-sm">Subjonctif + Conditionnel + structures impersonnelles = le trio de l'élégance académique.</p>
        </div>
      </div>
    `
  },
  {
    id: 9,
    titre: "MODULE III : LA COMPLEXITÉ SYNTAXIQUE",
    duree: "30 min",
    description: "Densifier son écriture, pronoms relatifs composés, gérondif, apposition et phrase complexe.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">LA COMPLEXITÉ SYNTAXIQUE</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Densifier son écriture, Un texte de niveau avancé ne relie pas des idées, il les <em>encapsule</em>.</p>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-5 md:p-6 rounded-r-2xl mb-8">
          <p class="font-bold text-blue-900 mb-2">💡 Introduction</p>
          <p class="text-blue-800 text-sm md:text-base leading-relaxed">
            Maîtriser la complexité syntaxique permet de rédiger des phrases longues, claires et élégantes, typiques de l'écriture formelle et académique.
          </p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">1. Les Pronoms Relatifs Composés <span class="text-base font-bold text-orange-500">(Pour la Précision)</span></h4>
        <p class="mb-4">Vous connaissez <em>qui, que, dont, où</em>. Mais que faire lorsque le pronom relatif doit suivre une préposition autre que <em>de</em> ? Vous devez utiliser les pronoms composés.</p>
        <p class="mb-4 text-sm">Ils sont formés de l'article (<em>le, la, les</em>) + <em>quel</em> (+ préposition).</p>

        <div class="overflow-x-auto mb-6 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100 text-slate-600 uppercase tracking-widest text-xs">
              <tr><th class="p-3">Préposition</th><th class="p-3">Masc. sing.</th><th class="p-3">Fém. sing.</th><th class="p-3">Masc. plur.</th><th class="p-3">Fém. plur.</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-3 font-bold text-orange-700">Avec</td><td class="p-3">Avec lequel</td><td class="p-3">Avec laquelle</td><td class="p-3">Avec lesquels</td><td class="p-3">Avec lesquelles</td></tr>
              <tr class="bg-slate-50"><td class="p-3 font-bold text-orange-700">À</td><td class="p-3 font-bold">Auquel</td><td class="p-3">À laquelle</td><td class="p-3 font-bold">Auxquels</td><td class="p-3 font-bold">Auxquelles</td></tr>
              <tr><td class="p-3 font-bold text-orange-700">Pour</td><td class="p-3">Pour lequel</td><td class="p-3">Pour laquelle</td><td class="p-3">Pour lesquels</td><td class="p-3">Pour lesquelles</td></tr>
            </tbody>
          </table>
        </div>

        <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-8">
          <p class="font-black text-amber-900 mb-2">🌟 Astuce TCF</p>
          <p class="text-sm text-amber-800 mb-3">L'usage le plus fréquent et le plus valorisé est le pronom composé précédé des prépositions <strong>à</strong> et <strong>dans</strong>.</p>
          <div class="space-y-2">
            <p class="text-sm italic text-amber-700 bg-white p-2 rounded-lg border border-amber-100">"C'est un sujet <strong>auquel</strong> nous n'avions pas pensé."</p>
            <p class="text-sm italic text-amber-700 bg-white p-2 rounded-lg border border-amber-100">"C'est une situation <strong>dans laquelle</strong> je me suis senti démuni."</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">2. Le Gérondif et le Participe Présent <span class="text-base font-bold text-orange-500">(Pour la Concision)</span></h4>
        <p class="mb-5">Ces structures permettent d'économiser des mots et d'éviter les subordonnées lourdes (<em>qui, que</em>).</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-1">A. Le Gérondif</p>
            <p class="text-xs font-bold text-blue-600 uppercase mb-3">en + Participe Présent → Manière ou Simultanéité</p>
            <div class="space-y-2">
              <div class="bg-white p-3 rounded-lg border border-blue-100">
                <p class="text-xs text-blue-500 mb-1">Manière :</p>
                <p class="text-sm italic text-blue-800">"Il a appris le français <strong>en voyageant</strong>."</p>
              </div>
              <div class="bg-white p-3 rounded-lg border border-blue-100">
                <p class="text-xs text-blue-500 mb-1">Simultanéité :</p>
                <p class="text-sm italic text-blue-800">"<strong>En arrivant</strong> à la maison, j'ai vu la surprise."</p>
              </div>
            </div>
          </div>
          <div class="bg-purple-50 p-5 rounded-2xl border border-purple-200">
            <p class="font-black text-purple-900 mb-1">B. Le Participe Présent</p>
            <p class="text-xs font-bold text-purple-600 uppercase mb-3">La Clause Condensée</p>
            <p class="text-sm text-purple-800 mb-3">Utilisé seul, il résume une cause ou une explication, typiquement après une virgule.</p>
            <div class="bg-white p-3 rounded-lg border border-purple-100">
              <p class="text-sm italic text-purple-800">"Les étudiants, <strong>ayant fini</strong> leur examen, sont sortis."</p>
              <p class="text-xs text-purple-500 mt-1">(Remplace : <em>...parce qu'ils avaient fini...</em>)</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">3. L'Apposition <span class="text-base font-bold text-orange-500">(L'Élégance de la Synthèse)</span></h4>
        <p class="mb-4">L'Apposition consiste à accoler un groupe nominal (ou un adjectif/participe) à un nom pour le caractériser, en l'isolant par des virgules. C'est le moyen le plus simple de densifier votre pensée.</p>
        <div class="grid md:grid-cols-2 gap-4 mb-8">
          <div class="bg-red-50 p-4 rounded-xl border border-red-200">
            <p class="text-xs font-bold text-red-700 mb-2">❌ Au lieu de :</p>
            <p class="text-sm italic text-red-800">"L'économie est en crise. Cette crise est majeure."</p>
          </div>
          <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <p class="text-xs font-bold text-emerald-700 mb-2">✅ Dites :</p>
            <p class="text-sm italic text-emerald-800">"L'économie, <strong>crise majeure</strong>, affecte tous les secteurs."</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">4. La Mise en Relief : C'est... qui / C'est... que</h4>
        <p class="mb-4">Cette structure est essentielle pour mettre l'accent sur un élément précis de la phrase, montrant une intention stylistique claire.</p>
        <div class="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-8">
          <p class="text-sm italic text-orange-800">"<strong>C'est</strong> la culture <strong>qui</strong> est la plus touchée par les coupes budgétaires."</p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">5. La Syntaxe des Phrases</h4>
        <p class="mb-5">La syntaxe est l'architecture de la langue. Une phrase n'est pas juste une suite de mots, mais un ensemble organisé.</p>

        <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
          <p class="font-black text-slate-800 mb-3">a. La Phrase Simple : Les Fondations</p>
          <p class="text-sm text-slate-700 mb-3">Structure de base : <strong>Sujet + Verbe + Complément</strong>, Majuscule au début, ponctuation à la fin, un sens complet.</p>
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
              <p class="text-xs font-black text-blue-700 uppercase mb-1">① Le Sujet</p>
              <p class="text-xs text-blue-600">La personne ou la chose qui fait l'action</p>
              <p class="text-xs italic text-blue-500 mt-1">"Paul étudie."</p>
            </div>
            <div class="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
              <p class="text-xs font-black text-orange-700 uppercase mb-1">② Le Verbe</p>
              <p class="text-xs text-orange-600">Exprime l'action ou l'état</p>
              <p class="text-xs italic text-orange-500 mt-1">"Il <strong>mange</strong>."</p>
            </div>
            <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
              <p class="text-xs font-black text-emerald-700 uppercase mb-1">③ Le Complément</p>
              <p class="text-xs text-emerald-600">Donne plus d'informations</p>
              <p class="text-xs italic text-emerald-500 mt-1">"Elle lit <strong>un livre</strong>."</p>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <p class="font-black text-slate-800 mb-3">b. Les 4 Types de Phrases</p>
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-left bg-white text-sm">
              <thead class="bg-slate-100 text-slate-600 uppercase tracking-widest text-xs">
                <tr><th class="p-3">Type</th><th class="p-3">Intention</th><th class="p-3">Ponctuation</th><th class="p-3">Exemple</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr><td class="p-3 font-bold text-blue-700">Déclarative</td><td class="p-3">Donner une information</td><td class="p-3 text-center font-black">.</td><td class="p-3 italic">"Le ciel est bleu."</td></tr>
                <tr class="bg-slate-50"><td class="p-3 font-bold text-blue-700">Interrogative</td><td class="p-3">Poser une question</td><td class="p-3 text-center font-black">?</td><td class="p-3 italic">"Viendras-tu demain ?"</td></tr>
                <tr><td class="p-3 font-bold text-blue-700">Exclamative</td><td class="p-3">Exprimer une émotion forte</td><td class="p-3 text-center font-black">!</td><td class="p-3 italic">"Quel magnifique paysage !"</td></tr>
                <tr class="bg-slate-50"><td class="p-3 font-bold text-blue-700">Injonctive</td><td class="p-3">Donner un ordre ou conseil</td><td class="p-3 text-center font-black">. / !</td><td class="p-3 italic">"Ferme la porte !"</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mb-6">
          <p class="font-black text-slate-800 mb-3">c. Les 3 Formes de Phrases Complexes</p>
          <div class="space-y-4">
            <div class="bg-white p-5 rounded-xl border border-slate-200">
              <p class="font-bold text-orange-700 mb-2">1. La Juxtaposition</p>
              <p class="text-sm text-slate-700 mb-2">Propositions indépendantes séparées par la ponctuation seulement (virgule, point-virgule, deux-points).</p>
              <div class="space-y-1">
                <p class="text-xs italic text-slate-600 bg-slate-50 p-2 rounded">"Le vent souffle, les feuilles tombent."</p>
                <p class="text-xs italic text-slate-600 bg-slate-50 p-2 rounded">"Il ne sort pas : il pleut trop fort."</p>
              </div>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200">
              <p class="font-bold text-orange-700 mb-2">2. La Coordination</p>
              <p class="text-sm text-slate-700 mb-2">Reliées par une conjonction (<em>mais, ou, et, donc, or, ni, car</em>) ou un adverbe (<em>puis, alors, cependant</em>). Chaque proposition pourrait exister seule.</p>
              <p class="text-xs italic text-slate-600 bg-slate-50 p-2 rounded">"Il a fini son cours <strong>et</strong> il est allé au sport."</p>
            </div>
            <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
              <p class="font-bold text-blue-800 mb-2">3. La Subordination (la plus riche)</p>
              <p class="text-sm text-blue-700 mb-3">Une proposition (subordonnée) est "sous les ordres" d'une autre (principale). Reliées par un mot subordonnant : <em>que, quand, parce que, si, lorsque, puisque...</em></p>
              <div class="grid md:grid-cols-3 gap-2">
                <div class="bg-white p-3 rounded-lg border border-blue-100">
                  <p class="text-xs font-bold text-blue-700 mb-1">La Relative</p>
                  <p class="text-xs text-blue-600">Complète un nom.</p>
                  <p class="text-xs italic text-blue-500 mt-1">"Le livre <strong>que tu m'as prêté</strong> est génial."</p>
                </div>
                <div class="bg-white p-3 rounded-lg border border-blue-100">
                  <p class="text-xs font-bold text-blue-700 mb-1">La Complétive</p>
                  <p class="text-xs text-blue-600">Complète un verbe (souvent "que").</p>
                  <p class="text-xs italic text-blue-500 mt-1">"Je pense <strong>que tu as raison</strong>."</p>
                </div>
                <div class="bg-white p-3 rounded-lg border border-blue-100">
                  <p class="text-xs font-bold text-blue-700 mb-1">La Circonstancielle</p>
                  <p class="text-xs text-blue-600">Cause, temps, but, condition.</p>
                  <p class="text-xs italic text-blue-500 mt-1">"<strong>Si tu étudies</strong>, tu réussiras."</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-2">✅ Vous avez maintenant toutes les clés pour densifier votre écriture.</p>
          <p class="text-sm text-slate-300">Pronoms relatifs composés + Gérondif + Subordination = le trio de la complexité syntaxique maîtrisée.</p>
        </div>
      </div>
    `
  }
];

export const quizSemaine3: QuizQuestion[] = [
  {
    question: "Dans 'Des réponses précises', pourquoi l'adjectif prend-il un '-s' et un '-es' ?",
    options: [
      "Parce que le nom 'réponses' est masculin pluriel",
      "Parce que l'adjectif s'accorde en genre et en nombre avec le nom 'réponses' (féminin pluriel)",
      "Parce que les adjectifs en '-s' sont toujours invariables",
      "Parce que la règle ne s'applique qu'aux adjectifs de couleur"
    ],
    reponseCorrecte: 1,
    explication: "L'accord de base : l'adjectif qualificatif s'accorde en genre (féminin) et en nombre (pluriel) avec le nom qu'il qualifie. 'Réponses' est féminin pluriel → 'précises'."
  },
  {
    question: "Dans 'La liste des documents demandés par les services d'immigration est longue', avec quoi s'accorde le verbe ?",
    options: [
      "Avec 'documents' (pluriel)",
      "Avec 'services' (pluriel)",
      "Avec 'liste' (singulier)",
      "Avec 'immigration' (singulier)"
    ],
    reponseCorrecte: 2,
    explication: "Piège du sujet éloigné : le verbe s'accorde toujours avec le vrai sujet grammatical, qui est 'la liste' (féminin singulier). Les mots entre le sujet et le verbe ne changent pas l'accord."
  },
  {
    question: "Laquelle de ces phrases est correcte avec le participe passé conjugué avec 'avoir' ?",
    options: [
      "\"J'ai mangées des pommes.\"",
      "\"Les pommes que j'ai mangé.\"",
      "\"Les pommes que j'ai mangées.\"",
      "\"J'ai mangés des pommes.\""
    ],
    reponseCorrecte: 2,
    explication: "Règle d'or de 'avoir' : on s'accorde avec le COD uniquement si celui-ci est placé AVANT le verbe. 'Les pommes que j'ai mangées', le pronom relatif 'que' représente 'les pommes' (féminin pluriel) et est placé avant 'ai mangées' → accord."
  },
  {
    question: "Pourquoi dit-on 'Elle s'est lavé les mains' sans accord ?",
    options: [
      "Parce que les verbes pronominaux ne s'accordent jamais",
      "Parce que le COD 'les mains' est placé après le verbe",
      "Parce que 'laver' est un verbe irrégulier",
      "Parce que 'se' est masculin singulier"
    ],
    reponseCorrecte: 1,
    explication: "Verbes pronominaux : l'accord se fait avec le sujet si le sujet fait l'action sur lui-même ET qu'il n'y a pas de COD après. Ici 'les mains' est le COD placé après → pas d'accord. 'Elle s'est lavée' (sans COD après) serait correct."
  },
  {
    question: "Laquelle de ces phrases est correcte selon la règle de 'Tout' ?",
    options: [
      "\"Elle est toute étonnée.\" (devant une voyelle)",
      "\"Elle est tout honteuse.\" (devant 'h' aspiré)",
      "\"Elle est toute honteuse.\" (devant 'h' aspiré)",
      "\"Elles sont tout heureuses.\" (devant 'h' muet)"
    ],
    reponseCorrecte: 2,
    explication: "'Tout' adverbe est normalement invariable, SAUF devant un adjectif féminin commençant par une consonne ou un 'h' aspiré. 'Honteuse' commence par 'h' aspiré → 'toute'. Mais devant une voyelle ou 'h' muet, 'tout' reste invariable : 'elle est tout étonnée'."
  },

  // ── Module II : Argumenter et nuancer ──────────────────────────────────
  {
    question: "Après 'Je pense que...', quel mode doit-on utiliser ?",
    options: [
      "Le Subjonctif",
      "Le Conditionnel",
      "L'Indicatif",
      "L'Infinitif"
    ],
    reponseCorrecte: 2,
    explication: "Règle d'or : 'Je pense que' et 'Je crois que' demandent l'Indicatif. Ex : 'Je pense que c'est vrai.' Le Subjonctif n'est utilisé qu'à la forme NÉGATIVE : 'Je ne pense pas que ce soit vrai.'"
  },
  {
    question: "Laquelle de ces structures exprime la nécessité avec le Subjonctif au niveau C1 ?",
    options: [
      "\"Il faut faire quelque chose.\"",
      "\"Il est essentiel que la jeunesse soit éduquée.\"",
      "\"Je veux que tu fais ça.\"",
      "\"Il doute faire des efforts.\""
    ],
    reponseCorrecte: 1,
    explication: "'Il est essentiel que + Subjonctif' est une structure C1. Notez le subjonctif 'soit' après 'que'. 'Il faut faire' utilise l'infinitif (sans 'que'), et 'tu fais' après 'vouloir que' est faux, il faut 'tu fasses' (subjonctif)."
  },
  {
    question: "Comment transformer 'Si le maire fait ça, la ville sera meilleure' au niveau B2/C1 ?",
    options: [
      "\"Si le maire ferait ça, la ville sera meilleure.\"",
      "\"Si le maire fait ça, la ville serait meilleure.\"",
      "\"Si cette mesure était adoptée, la qualité de vie serait grandement améliorée.\"",
      "\"Si le maire fasse ça, la ville sera meilleure.\""
    ],
    reponseCorrecte: 2,
    explication: "Structure B2/C1 : SI + Imparfait → Conditionnel Présent. 'Si cette mesure était adoptée (Imparfait), la qualité serait améliorée (Conditionnel).' On gagne aussi en impersonnalité et en formalisme."
  },
  {
    question: "Quelle structure permet de transformer 'Le gouvernement a pris la décision' en style académique ?",
    options: [
      "\"Le gouvernement aurait pris la décision.\"",
      "\"On pense que le gouvernement a pris la décision.\"",
      "\"La décision a été prise par le gouvernement.\"",
      "\"Il est essentiel que le gouvernement prenne la décision.\""
    ],
    reponseCorrecte: 2,
    explication: "La Voix Passive rend le texte plus académique et objectif en effaçant le 'Je' ou le sujet actif. 'La décision a été prise par le gouvernement', le sujet grammatical devient 'la décision'."
  },
  {
    question: "Quel est le Conditionnel Passé de 'voter' dans une hypothèse non réalisée ?",
    options: [
      "\"J'aurais voté\", pour une hypothèse non réalisée dans le passé",
      "\"Je voterais\", pour une hypothèse actuelle",
      "\"J'avais voté\", pour une action antérieure",
      "\"Je voterai\", pour une action future"
    ],
    reponseCorrecte: 0,
    explication: "Le Conditionnel Passé = Avoir/Être au Conditionnel Présent + Participe Passé. Il exprime un regret ou une hypothèse non réalisée dans le passé : 'Si j'avais su, j'aurais voté différemment.' (Action non réalisée = Conséquence non réalisée)."
  },

  // ── Module III : Complexité Syntaxique ────────────────────────────────
  {
    question: "Comment complète-t-on 'C'est un sujet ___ nous n'avions pas pensé' avec un pronom relatif composé ?",
    options: [
      "dont",
      "auquel",
      "que",
      "lequel"
    ],
    reponseCorrecte: 1,
    explication: "Après la préposition 'à', on utilise 'auquel' (à + lequel, masculin singulier). 'Penser à quelque chose' → 'un sujet auquel nous n'avions pas pensé.' C'est le pronom composé le plus valorisé par les correcteurs du TCF."
  },
  {
    question: "Quelle est la fonction du Gérondif dans 'Il a appris le français en voyageant' ?",
    options: [
      "Il exprime la cause",
      "Il exprime la manière (comment il a appris)",
      "Il exprime le but",
      "Il exprime la conséquence"
    ],
    reponseCorrecte: 1,
    explication: "Le Gérondif (en + Participe Présent) exprime la MANIÈRE ou la SIMULTANÉITÉ. Ici, 'en voyageant' indique la manière dont il a appris. La simultanéité serait : 'En arrivant à la maison, j'ai vu la surprise.'"
  },
  {
    question: "Quelle phrase illustre correctement une APPOSITION ?",
    options: [
      "\"L'économie est en crise et cette crise est majeure.\"",
      "\"L'économie, crise majeure, affecte tous les secteurs.\"",
      "\"Parce que l'économie est en crise, les secteurs souffrent.\"",
      "\"L'économie qui est en crise affecte tous les secteurs.\""
    ],
    reponseCorrecte: 1,
    explication: "L'Apposition accolle un groupe nominal au nom principal, isolé par des virgules, pour densifier la pensée en une seule phrase. 'L'économie, crise majeure, affecte...', on évite deux phrases courtes et on gagne en élégance."
  },
  {
    question: "Dans 'Je pense que tu as raison', quelle est la proposition subordonnée ?",
    options: [
      "\"Je pense\"",
      "\"que tu\"",
      "\"que tu as raison\"",
      "Il n'y a pas de proposition subordonnée"
    ],
    reponseCorrecte: 2,
    explication: "La proposition subordonnée complète la proposition principale et ne peut pas exister seule. 'Je pense' peut exister seule (prop. principale). 'Que tu as raison' ne peut pas exister seule → c'est la proposition subordonnée complétive."
  },
  {
    question: "Quelle est la différence entre la Juxtaposition et la Coordination dans une phrase complexe ?",
    options: [
      "La juxtaposition utilise des conjonctions, la coordination utilise la ponctuation",
      "La juxtaposition utilise la ponctuation seulement, la coordination utilise des conjonctions (mais, et, car...)",
      "La juxtaposition et la coordination sont identiques",
      "La juxtaposition ne peut avoir que deux propositions, la coordination en a toujours trois"
    ],
    reponseCorrecte: 1,
    explication: "Juxtaposition : propositions liées par la ponctuation seulement (virgule, point-virgule, deux-points). Ex : 'Le vent souffle, les feuilles tombent.' Coordination : liées par une conjonction (mais, ou, et, donc, or, ni, car). Ex : 'Il a fini son cours et il est allé au sport.'"
  }
];
