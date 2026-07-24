import { CoursModule, QuizQuestion } from "./cours_semaine1";

export const coursSemaine4: CoursModule[] = [
  {
    id: 10,
    titre: "MODULE BONUS : LES PIÈGES MORTELS",
    duree: "35 min",
    description: "Sécuriser les derniers points en éliminant les micro-erreurs d'orthographe, de grammaire et de vocabulaire les plus coûteuses.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">LES PIÈGES MORTELS</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Sécuriser les derniers points, Les micro-erreurs peuvent invalider l'impression de maîtrise que vous avez construite. Ce module vous aide à les éliminer définitivement.</p>

        <div class="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-sm">
          <p class="font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm">🎯 Ce module couvre :</p>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3 font-medium text-sm">
            <li class="flex items-center gap-2">📌 Les homophones grammaticaux (a/à, on/ont…)</li>
            <li class="flex items-center gap-2">📌 Les prépositions piégeuses après les verbes</li>
            <li class="flex items-center gap-2">📌 Les faux-amis et anglicismes fréquents</li>
            <li class="flex items-center gap-2">📌 Les pièges de l'expression orale</li>
            <li class="flex items-center gap-2">📌 Les constructions verbales déterminantes</li>
            <li class="flex items-center gap-2">📌 Les pronoms "En" et "Y" et leur ordre</li>
            <li class="flex items-center gap-2 md:col-span-2">📌 La ponctuation française (signes doubles, virgule logique)</li>
          </ul>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">1. Les Confusions Fréquentes (Homophones Grammaticaux)</h4>
        <p class="mb-4">Ces fautes sont considérées comme des erreurs de niveau A2/B1 et coûtent très cher à un candidat C1.</p>

        <div class="overflow-x-auto mb-8 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100 text-slate-600 uppercase tracking-widest text-xs">
              <tr>
                <th class="p-4">Erreur</th>
                <th class="p-4">Test de substitution</th>
                <th class="p-4">Exemple Correct</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr>
                <td class="p-4 font-bold text-orange-700">a (Verbe avoir) / à (Préposition)</td>
                <td class="p-4 text-slate-600">Remplacer par <em>avait</em> (Imparfait)</td>
                <td class="p-4 italic text-slate-700">Il <strong>a</strong> faim. = Il <em>avait</em> faim. / Je vais <strong>à</strong> la ville.</td>
              </tr>
              <tr class="bg-slate-50">
                <td class="p-4 font-bold text-orange-700">on (Pronom) / ont (Verbe avoir)</td>
                <td class="p-4 text-slate-600">Remplacer par <em>nous</em> / <em>avaient</em></td>
                <td class="p-4 italic text-slate-700"><strong>On</strong> le sait. = Nous le savons. / Ils <strong>ont</strong> compris. = Ils <em>avaient</em> compris.</td>
              </tr>
              <tr>
                <td class="p-4 font-bold text-orange-700">ce (Démonstratif) / se (Pronom réfléchi)</td>
                <td class="p-4 text-slate-600">Remplacer par <em>cela</em> / <em>me</em> ou <em>te</em></td>
                <td class="p-4 italic text-slate-700"><strong>Ce</strong> livre. = Cela, ce livre. / Il <strong>se</strong> lave. = Il me lave.</td>
              </tr>
              <tr class="bg-slate-50">
                <td class="p-4 font-bold text-orange-700">sont (Verbe être) / son (Déterminant possessif)</td>
                <td class="p-4 text-slate-600">Remplacer par <em>étaient</em> / <em>mon</em> ou <em>ton</em></td>
                <td class="p-4 italic text-slate-700">Ils <strong>sont</strong> là. = Ils <em>étaient</em> là. / <strong>Son</strong> idée. = Mon idée.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">2. Les Pièges Verbaux : Les Prépositions</h4>
        <p class="mb-5">De nombreux verbes français exigent une préposition spécifique (souvent <em>à</em> ou <em>de</em>). Les intervertir est une erreur typique.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-3">Verbes qui demandent "À"</p>
            <ul class="space-y-2 text-sm text-blue-800">
              <li class="bg-white p-3 rounded-lg border border-blue-100 italic">Participer <strong>à</strong> quelque chose.</li>
              <li class="bg-white p-3 rounded-lg border border-blue-100 italic">S'habituer <strong>à</strong> quelque chose.</li>
              <li class="bg-white p-3 rounded-lg border border-blue-100 italic">Nuire <strong>à</strong> quelqu'un.</li>
            </ul>
          </div>
          <div class="bg-orange-50 p-5 rounded-2xl border border-orange-200">
            <p class="font-black text-orange-900 mb-3">Verbes qui demandent "DE"</p>
            <ul class="space-y-2 text-sm text-orange-800">
              <li class="bg-white p-3 rounded-lg border border-orange-100 italic">Dépendre <strong>de</strong> quelque chose.</li>
              <li class="bg-white p-3 rounded-lg border border-orange-100 italic">Rêver <strong>de</strong> quelque chose.</li>
              <li class="bg-white p-3 rounded-lg border border-orange-100 italic">Se souvenir <strong>de</strong> quelque chose.</li>
            </ul>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">3. Les Pièges de Vocabulaire (Faux-amis et Anglicismes)</h4>
        <p class="mb-5">Très fréquents pour les candidats qui vivent en milieu anglophone ou travaillent en entreprise.</p>

        <div class="space-y-4 mb-8">
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">"Opportunité" vs "Occasion"</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Piège (Anglicisme)</p>
                <p class="text-sm italic text-red-800">"J'ai eu une opportunité de visiter le Canada."</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correct</p>
                <p class="text-sm italic text-emerald-800">"J'ai eu l'<strong>occasion</strong> de visiter le Canada."</p>
              </div>
            </div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">"Supporter" vs "Soutenir"</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Piège (supporter = tolérer)</p>
                <p class="text-sm italic text-red-800">"Je supporte mon ami dans son projet."</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correct</p>
                <p class="text-sm italic text-emerald-800">"Je <strong>soutiens</strong> mon ami dans son projet."</p>
              </div>
            </div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">"Réaliser" vs "Se rendre compte"</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Piège (Anglicisme)</p>
                <p class="text-sm italic text-red-800">"J'ai réalisé qu'il était tard."</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correct</p>
                <p class="text-sm italic text-emerald-800">"Je <strong>me suis rendu compte</strong> qu'il était tard."</p>
              </div>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">4. Les Pièges de l'Expression Orale (Phonétique et Registre)</h4>

        <div class="space-y-4 mb-8">
          <div class="bg-amber-50 p-5 rounded-xl border border-amber-200">
            <p class="font-bold text-amber-900 mb-2">Le "Tu" vs le "Vous"</p>
            <p class="text-sm text-amber-800">Passer du "vous" au "tu" au milieu d'un jeu de rôle avec l'examinateur est une faute grave de registre. Restez <strong>constant dans le vouvoiement</strong> du début à la fin.</p>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">La négation incomplète</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Oral très familier</p>
                <p class="text-sm italic text-red-800">"Je sais pas si je peux."</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correction (niveaux supérieurs)</p>
                <p class="text-sm italic text-emerald-800">"Je <strong>ne</strong> sais pas si je peux."</p>
              </div>
            </div>
          </div>
          <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
            <p class="font-bold text-blue-900 mb-2">Les liaisons dangereuses</p>
            <p class="text-sm text-blue-800">Ne pas faire la liaison pour "Ils ont" (prononcé "il-on" au lieu de "il-<strong>z</strong>on") peut être interprété comme une erreur de conjugaison entre singulier et pluriel.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">5. Les Erreurs de Construction Verbale <span class="text-orange-500 text-base font-bold">(Déterminant pour le score)</span></h4>
        <p class="mb-4">Les examinateurs détestent les mauvaises prépositions après un verbe.</p>

        <div class="space-y-4 mb-8">
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">Pallier + Nom (et non "pallier à")</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Erreur fréquente</p>
                <p class="text-sm italic text-red-800">"Pour pallier <strong>aux</strong> problèmes d'immigration..."</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correct</p>
                <p class="text-sm italic text-emerald-800">"Pour <strong>pallier les</strong> problèmes..."</p>
              </div>
            </div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">Se rappeler + Nom (et non "se rappeler de")</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Erreur fréquente</p>
                <p class="text-sm italic text-red-800">"Je me rappelle <strong>de</strong> mon voyage."</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correct</p>
                <p class="text-sm italic text-emerald-800">"Je me rappelle <strong>mon</strong> voyage." ou "Je <strong>me souviens de</strong> mon voyage."</p>
              </div>
            </div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">Demander à quelqu'un de faire (et non "demander pour faire")</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Anglicisme "ask for"</p>
                <p class="text-sm italic text-red-800">"Il a demandé <strong>pour</strong> partir."</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correct</p>
                <p class="text-sm italic text-emerald-800">"Il a demandé <strong>à</strong> partir."</p>
              </div>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">6. Le Piège des Pronoms <span class="text-orange-500 text-base font-bold">(La fluidité C1)</span></h4>

        <div class="space-y-4 mb-8">
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">Le "En" et le "Y", Éviter la redondance</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Redondance</p>
                <p class="text-sm italic text-red-800">"J'<strong>en</strong> ai besoin <strong>de ça</strong>."</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correct</p>
                <p class="text-sm italic text-emerald-800">"J'<strong>en</strong> ai besoin." ou "J'ai besoin <strong>de ça</strong>."</p>
              </div>
            </div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-3">L'ordre des pronoms à l'impératif négatif</p>
            <div class="grid md:grid-cols-2 gap-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <p class="text-xs font-bold text-red-700 mb-1">❌ Erreur</p>
                <p class="text-sm italic text-red-800">"Donne-le-moi-pas !"</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p class="text-xs font-bold text-emerald-700 mb-1">✅ Correct</p>
                <p class="text-sm italic text-emerald-800">"Ne me le donne pas !"</p>
              </div>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">7. La Ponctuation <span class="text-orange-500 text-base font-bold">(Souvent oubliée)</span></h4>
        <p class="mb-4">Au TCF écrit, la ponctuation est notée dans la "maîtrise des outils linguistiques".</p>

        <div class="space-y-4 mb-8">
          <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
            <p class="font-bold text-blue-900 mb-2">L'espace avant les signes doubles</p>
            <p class="text-sm text-blue-800">En français (contrairement à l'anglais), on met un espace <strong>avant et après</strong> les deux-points ( : ), le point d'interrogation ( ? ), le point d'exclamation ( ! ) et les guillemets (« »).</p>
          </div>
          <div class="bg-amber-50 p-5 rounded-xl border border-amber-200">
            <p class="font-bold text-amber-900 mb-3">La virgule après le connecteur logique</p>
            <div class="bg-white p-3 rounded-lg border border-amber-100">
              <p class="text-sm italic text-amber-800">"Par conséquent<strong>,</strong> je pense que...", La virgule après le connecteur est indispensable pour structurer l'argumentation.</p>
            </div>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-3 text-lg">✅ Vous avez maintenant toutes les clés pour sécuriser vos derniers points.</p>
          <ul class="space-y-2 text-sm text-slate-300">
            <li>✔ Testez chaque homophone avec sa substitution à l'imparfait</li>
            <li>✔ Mémorisez les verbes sans préposition (pallier) et ceux avec (se souvenir de)</li>
            <li>✔ Bannissez supporter, opportunité et réaliser de votre vocabulaire actif</li>
            <li>✔ Respectez le vouvoiement et le "ne" de négation à l'oral</li>
          </ul>
          <p class="text-slate-400 text-xs mt-4">Bonne préparation et bonne chance !</p>
        </div>
      </div>
    `
  }
];

export const quizSemaine4: QuizQuestion[] = [
  {
    question: "Comment distinguer 'a' (verbe avoir) de 'à' (préposition) ?",
    options: [
      "On remplace par 'est', si la phrase reste correcte, c'est 'a'",
      "On remplace par 'avait', si la phrase reste correcte, c'est 'a' (verbe avoir)",
      "On regarde si le mot suit un nom ou un adjectif",
      "'a' s'utilise uniquement en début de phrase"
    ],
    reponseCorrecte: 1,
    explication: "Test de substitution : remplacer par 'avait' (imparfait). 'Il a faim' → 'Il avait faim' ✅ = verbe avoir. 'Je vais à la ville' → 'Je vais avait la ville' ❌ = préposition. Ce test fonctionne pour tous les homophones verbaux."
  },
  {
    question: "Laquelle de ces phrases est correcte ?",
    options: [
      "\"On ont décidé de partir tôt.\"",
      "\"Ils a préparé leur dossier.\"",
      "\"On a décidé de partir tôt.\"",
      "\"Ils ont décidé de partir tôt, on avait raison.\""
    ],
    reponseCorrecte: 2,
    explication: "'On' est un pronom singulier → il prend 'a' (3e personne du singulier). 'Ont' est le verbe avoir à la 3e personne du pluriel (ils/elles ont). Test : 'Nous avons décidé' ✅ confirme que 'on a décidé' est correct."
  },
  {
    question: "Laquelle de ces constructions verbales est correcte en français standard ?",
    options: [
      "\"Pour pallier aux problèmes de logement...\"",
      "\"Pour pallier les problèmes de logement...\"",
      "\"Pour pallier de tous les problèmes...\"",
      "\"Pour pallier à tous ces problèmes...\""
    ],
    reponseCorrecte: 1,
    explication: "'Pallier' est un verbe transitif direct : il se construit SANS préposition. On dit 'pallier quelque chose', jamais 'pallier à quelque chose'. C'est une des erreurs les plus coûteuses au TCF car elle révèle une méconnaissance des constructions verbales de niveau C1."
  },
  {
    question: "Comment traduire correctement 'I realized it was late' en français soutenu ?",
    options: [
      "\"J'ai réalisé qu'il était tard.\"",
      "\"Je réalisais qu'il était tard.\"",
      "\"Je me suis rendu compte qu'il était tard.\"",
      "\"J'ai compris réaliser qu'il était tard.\""
    ],
    reponseCorrecte: 2,
    explication: "Anglicisme classique : 'réaliser' en français signifie 'accomplir, créer' (réaliser un film, réaliser son rêve). Pour exprimer 'to realize' (prendre conscience), on dit 'se rendre compte' : 'Je me suis rendu compte qu'il était tard.'"
  },
  {
    question: "Quelle phrase respecte la règle du 'se rappeler' ?",
    options: [
      "\"Je me rappelle de notre première rencontre.\"",
      "\"Je me rappelle notre première rencontre.\"",
      "\"Je me rappelle à notre première rencontre.\"",
      "\"Je me rappelle bien de toi.\""
    ],
    reponseCorrecte: 1,
    explication: "'Se rappeler' est transitif direct : 'se rappeler QUELQUE CHOSE' sans préposition. On dit 'Je me rappelle mon voyage' mais jamais 'Je me rappelle DE mon voyage'. Si on veut utiliser 'de', il faut changer de verbe : 'Je me souviens DE mon voyage'."
  },
  {
    question: "Dans quel cas le pronom 'en' est-il utilisé correctement ?",
    options: [
      "\"J'en ai besoin de ça.\"",
      "\"J'en ai besoin.\"",
      "\"J'en veux de ce livre.\"",
      "\"Il en va à Paris.\""
    ],
    reponseCorrecte: 1,
    explication: "'En' remplace déjà 'de + complément'. Dire 'J'en ai besoin de ça' est une redondance : le pronom 'en' et 'de ça' expriment la même chose. La forme correcte est soit 'J'en ai besoin' (avec le pronom), soit 'J'ai besoin de ça' (sans pronom)."
  },
  {
    question: "Quelle phrase illustre une erreur de registre à l'oral face à un examinateur ?",
    options: [
      "\"Je ne sais pas si je pourrais être disponible.\"",
      "\"Vous avez raison, monsieur.\"",
      "\"Vous pensez que... tu es d'accord avec moi ?\"",
      "\"Je ne me souviens pas de la date exacte.\""
    ],
    reponseCorrecte: 2,
    explication: "Passer du 'vous' au 'tu' au milieu d'un échange avec l'examinateur est une faute grave de cohérence de registre. Au TCF, vous devez maintenir le vouvoiement de façon constante tout au long du jeu de rôle ou de l'interaction orale."
  },
  {
    question: "Quelle est la ponctuation correcte en français pour les signes doubles ?",
    options: [
      "\"Comment allez-vous?\" (sans espace avant le ?)",
      "\"Comment allez-vous ?\" (avec espace avant le ?)",
      "\"Comment allez-vous ?\" n'est correct qu'à l'écrit formel",
      "Les règles d'espacement sont identiques en français et en anglais"
    ],
    reponseCorrecte: 1,
    explication: "En français, les signes doubles (? ! : ; «») sont précédés d'une espace insécable. 'Comment allez-vous ?' est correct. Cette règle est évaluée dans la 'maîtrise des outils linguistiques' du TCF écrit et distingue un C1 d'un B2."
  },
  {
    question: "Quelle phrase corrige le mieux 'Je sais pas si je peux venir' au niveau C1 ?",
    options: [
      "\"Je sais pas vraiment si je peux venir.\"",
      "\"Je ne sais pas vraiment si je peux venir.\"",
      "\"Je sais pas si je pourrais venir.\"",
      "\"Je ne peux pas vraiment savoir si je viens.\""
    ],
    reponseCorrecte: 1,
    explication: "Le 'ne' est indispensable pour valider les niveaux supérieurs à l'oral. Omettre 'ne' dans 'Je ne sais pas' est une marque de registre très familier incompatible avec le niveau C1. L'ajout de 'vraiment' accentue la nuance et renforce l'élégance de la formulation."
  },
  {
    question: "Pourquoi 'Je supporte mon ami dans son projet' est-il incorrect ?",
    options: [
      "Parce que 'supporter' s'utilise uniquement avec des choses inanimées",
      "Parce qu'en français, 'supporter' signifie tolérer quelque chose de désagréable, pas encourager",
      "Parce que le verbe correct est 'appuyer' et non 'soutenir'",
      "Parce que 'supporter' doit être suivi d'un infinitif"
    ],
    reponseCorrecte: 1,
    explication: "Anglicisme majeur : 'to support' en anglais = soutenir, encourager. Mais 'supporter' en français signifie 'tolérer quelque chose de difficile ou désagréable' (Je supporte mal la chaleur). Pour exprimer le soutien, on dit 'soutenir' : 'Je soutiens mon ami dans son projet.'"
  }
];
