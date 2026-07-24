import { CoursModule, QuizQuestion } from "./cours_semaine1";

export const coursSemaine2: CoursModule[] = [
  {
    id: 4,
    titre: "MODULE I : LA PONCTUATION AVANCÉE",
    duree: "20 min",
    description: "La 'touche Expert' pour sculpter vos textes avec précision et élégance.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">LA PONCTUATION AVANCÉE</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">La "touche Expert" qui sculpte la pensée et oriente le regard du lecteur.</p>

        <div class="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-sm">
          <p class="font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm">🎯 Ce module couvre :</p>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3 font-medium">
            <li class="flex items-center gap-2">📌 La ponctuation de fin de phrase</li>
            <li class="flex items-center gap-2">📌 La virgule : respiration du texte</li>
            <li class="flex items-center gap-2">📌 Point-virgule et deux-points</li>
            <li class="flex items-center gap-2">📌 Les signes doubles (guillemets, parenthèses...)</li>
          </ul>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-5 md:p-6 rounded-r-2xl mb-8">
          <p class="font-bold text-blue-900 mb-2">💡 Introduction</p>
          <p class="text-blue-800 text-sm md:text-base leading-relaxed">
            On dit souvent que le style est dans les détails. Dans l'art de l'écriture, ces détails portent un nom : la ponctuation. Souvent négligée au profit du vocabulaire, la ponctuation avancée est pourtant "la touche" finale qui permet de sculpter la pensée et d'orienter le regard du lecteur avec élégance. Maîtriser ces signes méconnus, c'est apprendre à jouer avec les silences, les ruptures et les nuances pour offrir à vos textes une signature d'expert.
          </p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">1. La ponctuation de fin de phrase (Le point final)</h4>
        <p class="mb-4">C'est le signal d'arrêt. Elle définit l'intention globale de la phrase.</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <p class="font-black text-slate-900 text-lg mb-2">Le point (.)</p>
            <p class="text-sm text-slate-700 mb-3">Pour les déclarations simples. Il marque une pause longue.</p>
            <div class="bg-white p-3 rounded-lg border border-slate-100">
              <p class="text-xs text-orange-700 italic">"Il ne voulait pas venir partager le repas."</p>
            </div>
          </div>
          <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
            <p class="font-black text-blue-900 text-lg mb-2">Le point d'interrogation (?)</p>
            <p class="text-sm text-blue-800 mb-3">Pour poser une question ou marquer l'incrédulité, l'étonnement.</p>
            <div class="bg-white p-3 rounded-lg border border-blue-100 space-y-1">
              <p class="text-xs text-blue-700 italic">"Veux-tu venir avec moi ?"</p>
              <p class="text-xs text-blue-700 italic">"Toi, Mayah, enceinte ? Tu blagues ?"</p>
            </div>
          </div>
          <div class="bg-orange-50 p-5 rounded-xl border border-orange-200">
            <p class="font-black text-orange-900 text-lg mb-2">Le point d'exclamation (!)</p>
            <p class="text-sm text-orange-800 mb-3">Pour les émotions fortes, les interjections, les ordres ou souhaits.</p>
            <div class="bg-white p-3 rounded-lg border border-orange-100 space-y-1">
              <p class="text-xs text-orange-700 italic">"Ah ! qu'elle était jolie !"</p>
              <p class="text-xs text-orange-700 italic">"Va à la cuisine, mon enfant !"</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">2. La respiration du texte (La virgule)</h4>
        <p class="mb-4">C'est l'outil le plus subtil. Elle marque une pause courte et sert à :</p>

        <div class="space-y-3 mb-8">
          <div class="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <span class="font-black text-orange-500 shrink-0">①</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Énumérer des mots ou groupes de mots</p>
              <p class="text-sm text-slate-600 italic">"J'ai acheté des pommes, des poires et des légumes verts."</p>
            </div>
          </div>
          <div class="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <span class="font-black text-orange-500 shrink-0">②</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Isoler un complément (qui pourrait être supprimé)</p>
              <p class="text-sm text-slate-600 italic">"Demain, s'il fait beau, nous irons au parc."</p>
            </div>
          </div>
          <div class="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <span class="font-black text-orange-500 shrink-0">③</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Séparer des propositions</p>
              <p class="text-sm text-slate-600 italic">"Il est arrivé, il a vu, il a vaincu."</p>
            </div>
          </div>
          <div class="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <span class="font-black text-orange-500 shrink-0">④</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Accompagner les mots mis en exergue</p>
              <p class="text-sm text-slate-600 italic">"Mère chérie, à qui me confiez-vous ?"</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">3. L'articulation logique (Point-virgule et Deux-points)</h4>
        <p class="mb-4">On monte d'un niveau en complexité.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-purple-50 p-6 rounded-2xl border border-purple-200">
            <p class="font-black text-purple-900 text-xl mb-1">Le point-virgule (;)</p>
            <p class="text-sm text-purple-800 mb-4">Sépare deux propositions indépendantes mais liées logiquement, sans connecteur. <strong>C'est un signe de sophistication.</strong></p>
            <div class="bg-white p-3 rounded-xl border border-purple-100">
              <p class="text-xs font-bold text-purple-600 mb-1">Exemple :</p>
              <p class="text-sm text-purple-900 italic">"Il ne voulait pas venir ; il était trop fatigué."</p>
              <p class="text-xs text-purple-600 mt-1">(Remplace "car")</p>
            </div>
          </div>
          <div class="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
            <p class="font-black text-emerald-900 text-xl mb-1">Les deux-points (:)</p>
            <p class="text-sm text-emerald-800 mb-4">Ils annoncent quelque chose : une explication, une citation ou une liste.</p>
            <div class="bg-white p-3 rounded-xl border border-emerald-100">
              <p class="text-xs font-bold text-emerald-600 mb-1">Exemple :</p>
              <p class="text-sm text-emerald-900 italic">"Il n'y a qu'une seule solution : travailler plus dur."</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">4. Les nuances et les voix (Signes doubles)</h4>

        <div class="space-y-4 mb-8">
          <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <p class="font-black text-slate-900 mb-2">Les points de suspension (...)</p>
            <p class="text-sm text-slate-700 mb-2">Pour le suspense, l'inachevé, l'hésitation ou le sous-entendu. On laisse le lecteur deviner la suite.</p>
            <p class="text-xs text-orange-700 italic bg-white p-2 rounded-lg border border-orange-100">"Tout le monde était là : mon père, mon frère, ma mère…"</p>
          </div>
          <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <p class="font-black text-slate-900 mb-2">Les guillemets (« »)</p>
            <p class="text-sm text-slate-700 mb-2">Précédés de deux-points. Encadrent une citation, rapportent des paroles, ou marquent l'ironie / un mot étranger.</p>
            <p class="text-xs text-orange-700 italic bg-white p-2 rounded-lg border border-orange-100">"Tu sais, nos ancêtres disaient : «Les fantômes ne parlent jamais avant que la pluie ne soit tombée !»"</p>
            <div class="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
              <p class="text-xs font-bold text-amber-800">⚠️ Remarque :</p>
              <p class="text-xs text-amber-700">On ne met pas de ponctuation après le guillemet fermant une citation déjà ponctuée.</p>
            </div>
          </div>
          <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <p class="font-black text-slate-900 mb-2">Les parenthèses ( )</p>
            <p class="text-sm text-slate-700 mb-2">Pour ajouter une précision non indispensable au sens de la phrase.</p>
            <div class="grid md:grid-cols-2 gap-2 mt-2">
              <p class="text-xs text-orange-700 italic bg-white p-2 rounded-lg border border-orange-100">"Chemin faisant, il (le loup) vit le cou du chien pelé." <span class="not-italic text-slate-400">(explication)</span></p>
              <p class="text-xs text-orange-700 italic bg-white p-2 rounded-lg border border-orange-100">"Décidément, c'est un lion. (Un lion en papier, certes.)" <span class="not-italic text-slate-400">(aparté)</span></p>
            </div>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-3 text-lg">✅ Vous avez maintenant toutes les clés pour mieux utiliser les ponctuations dans vos rédactions.</p>
          <p class="text-slate-300 text-sm">Le Module 2 approfondira les connaissances de grammaire qui vous permettront de mieux appréhender l'expression écrite.</p>
        </div>
      </div>
    `
  },
  {
    id: 5,
    titre: "MODULE II : STRUCTURER SA PENSÉE",
    duree: "25 min",
    description: "Les connecteurs logiques indispensables pour passer du niveau B1 au C1.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">STRUCTURER SA PENSÉE</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">L'architecture de votre texte, passer de B1 à C1 grâce aux connecteurs.</p>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-5 md:p-6 rounded-r-2xl mb-8">
          <p class="font-bold text-blue-900 mb-2">💡 Introduction</p>
          <p class="text-blue-800 text-sm md:text-base leading-relaxed mb-3">
            Une idée brillante sans structure est comme un édifice sans fondations : elle risque de s'effondrer dès la première lecture. <strong>L'architecture d'un texte</strong> est le squelette invisible qui soutient vos arguments.
          </p>
          <p class="text-blue-800 text-sm md:text-base">Imaginez que votre texte soit une maison. Le vocabulaire, ce sont les briques. La grammaire, c'est le ciment. Mais <strong>les connecteurs logiques</strong>, ce sont les plans de l'architecte. Sans eux, la maison s'écroule.</p>
        </div>

        <div class="bg-slate-900 text-white p-5 rounded-xl mb-10">
          <p class="font-bold text-orange-400 mb-2">🎯 Objectif TCF</p>
          <p class="text-sm text-slate-200">Pour l'épreuve d'expression écrite (surtout les Tâches 2 et 3), vous devez guider le correcteur. Il ne doit jamais se demander : <em>"Pourquoi me dit-il ça maintenant ?"</em>.</p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">1. Les Connecteurs d'Opposition et de Concession</h4>
        <p class="mb-2 font-medium">C'est la catégorie la plus utile pour montrer que vous savez réfléchir de manière complexe (pas tout blanc, ni tout noir).</p>
        <div class="flex gap-4 mb-5">
          <div class="bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-sm"><span class="font-bold text-red-700">Niveau basique (A2/B1) :</span> <span class="italic text-red-600">Mais, pourtant</span></div>
          <div class="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-sm"><span class="font-bold text-emerald-700">Niveau avancé (B2/C1) :</span> voir tableau ↓</div>
        </div>

        <div class="overflow-x-auto mb-8 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100 text-slate-600 uppercase tracking-widest text-xs">
              <tr><th class="p-4">Connecteur</th><th class="p-4">Usage et Astuce TCF</th><th class="p-4">Exemple</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr>
                <td class="p-4 font-black text-orange-700">Bien que + Subjonctif</td>
                <td class="p-4"><strong>L'arme absolue.</strong> Remplace avantageusement "mais". Montre que vous maîtrisez le subjonctif.</td>
                <td class="p-4 italic text-slate-600">"Bien que le télétravail <strong>soit</strong> pratique, il crée de l'isolement."</td>
              </tr>
              <tr class="bg-slate-50">
                <td class="p-4 font-black text-orange-700">En revanche / Par contre</td>
                <td class="p-4">Pour opposer deux faits distincts. <em>Note : "Par contre" est toléré mais "En revanche" est plus élégant à l'écrit.</em></td>
                <td class="p-4 italic text-slate-600">"L'email est rapide. <strong>En revanche</strong>, le courrier postal est plus personnel."</td>
              </tr>
              <tr>
                <td class="p-4 font-black text-orange-700">Toutefois / Néanmoins</td>
                <td class="p-4">Pour introduire une nuance après une affirmation. Très formel et apprécié des correcteurs.</td>
                <td class="p-4 italic text-slate-600">"Ce projet est coûteux. <strong>Toutefois</strong>, il est nécessaire."</td>
              </tr>
              <tr class="bg-slate-50">
                <td class="p-4 font-black text-orange-700">Alors que / Tandis que</td>
                <td class="p-4">Pour comparer deux situations opposées en une seule phrase.</td>
                <td class="p-4 italic text-slate-600">"Paul préfère la ville <strong>alors que</strong> Marie adore la campagne."</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">2. La Cause et la Conséquence (L'enchaînement logique)</h4>
        <p class="mb-5 font-medium">Évitez de répéter 10 fois <em>"parce que"</em> dans votre texte. Variez pour montrer votre richesse linguistique.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 text-base mb-3">🔵 Pour exprimer la CAUSE</p>
            <div class="space-y-3">
              <div class="bg-white p-3 rounded-xl border border-blue-100">
                <p class="font-bold text-blue-800 text-sm">Puisque</p>
                <p class="text-xs text-blue-700 mb-1">Pour une cause évidente ou déjà connue.</p>
                <p class="text-xs italic text-blue-600">"Allons-y, <strong>puisque</strong> tu es prêt."</p>
              </div>
              <div class="bg-white p-3 rounded-xl border border-blue-100">
                <p class="font-bold text-blue-800 text-sm">Faute de + Nom/Infinitif <span class="text-orange-500">(Niveau C1)</span></p>
                <p class="text-xs text-blue-700 mb-1">Pour exprimer un manque ou une absence.</p>
                <p class="text-xs italic text-blue-600">"Il n'a pas fini, <strong>faute de temps</strong>."</p>
              </div>
              <div class="bg-white p-3 rounded-xl border border-blue-100">
                <p class="font-bold text-blue-800 text-sm">En raison de</p>
                <p class="text-xs text-blue-700 mb-1">Neutre et administratif, parfait pour la Tâche 2.</p>
                <p class="text-xs italic text-blue-600">"<strong>En raison de</strong> la météo, la réunion est annulée."</p>
              </div>
            </div>
          </div>
          <div class="bg-orange-50 p-5 rounded-2xl border border-orange-200">
            <p class="font-black text-orange-900 text-base mb-3">🟠 Pour exprimer la CONSÉQUENCE</p>
            <div class="space-y-3">
              <div class="bg-white p-3 rounded-xl border border-orange-100">
                <p class="font-bold text-orange-800 text-sm">C'est la raison pour laquelle</p>
                <p class="text-xs text-orange-700">Beaucoup plus "pro" que <em>"c'est pour ça que"</em>.</p>
              </div>
              <div class="bg-white p-3 rounded-xl border border-orange-100">
                <p class="font-bold text-orange-800 text-sm">Par conséquent / En conséquence</p>
                <p class="text-xs text-orange-700">Idéal en début de phrase pour conclure un paragraphe.</p>
              </div>
              <div class="bg-white p-3 rounded-xl border border-orange-100">
                <p class="font-bold text-orange-800 text-sm">Si bien que + Indicatif</p>
                <p class="text-xs text-orange-700">Pour une conséquence directe et prévisible.</p>
              </div>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">3. L'Organisation du discours (Le squelette)</h4>
        <p class="mb-4">Pour la Tâche 3 (l'essai argumentatif), ne jetez pas vos idées en vrac.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-red-50 p-5 rounded-xl border border-red-200">
            <p class="font-bold text-red-800 mb-3">❌ Au lieu de dire :</p>
            <p class="text-sm text-red-700 italic">"Et aussi... Et après... Enfin..."</p>
          </div>
          <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
            <p class="font-bold text-emerald-800 mb-3">✅ Dites plutôt :</p>
            <div class="space-y-1 text-sm">
              <p class="text-emerald-700"><strong>1.</strong> Dans un premier temps / Tout d'abord</p>
              <p class="text-emerald-700"><strong>2.</strong> Par ailleurs / En outre</p>
              <p class="text-emerald-700"><strong>3.</strong> Par exemple / Notamment</p>
              <p class="text-emerald-700"><strong>4.</strong> En définitive / En somme</p>
            </div>
          </div>
        </div>

        <div class="bg-amber-50 border border-amber-200 p-5 rounded-2xl mb-8">
          <p class="font-black text-amber-900 mb-2">⭐ L'astuce "D'une part... D'autre part"</p>
          <p class="text-sm text-amber-800 mb-3">Utilisez cette structure pour présenter deux aspects d'un même problème. Cela structure visuellement votre paragraphe et plaît beaucoup aux correcteurs.</p>
          <div class="bg-white p-3 rounded-xl border border-amber-100">
            <p class="text-sm italic text-amber-900">"Le sport est bénéfique. <strong>D'une part</strong>, il améliore la santé physique ; <strong>d'autre part</strong>, il réduit le stress."</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">🛠️ L'atelier pratique : Transformation TCF</h4>
        <p class="mb-5">Voici comment transformer une phrase de niveau A2 en une phrase de niveau C1 grâce à ce chapitre.</p>

        <div class="bg-red-50 p-5 rounded-xl border border-red-200 mb-4">
          <p class="font-bold text-red-800 text-xs uppercase mb-2">Phrase A2 (Trop simple) :</p>
          <p class="text-sm italic text-red-900">"Je ne suis pas d'accord avec cette idée. C'est intéressant mais c'est trop cher. Donc on ne peut pas le faire."</p>
        </div>
        <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-200 mb-8">
          <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Phrase C1 (Optimisée pour le TCF) :</p>
          <p class="text-sm text-emerald-900 font-medium">"<strong>Bien que</strong> cette idée <strong>soit</strong> intéressante, je ne peux y adhérer. <strong>En effet</strong>, son coût est prohibitif ; <strong>par conséquent</strong>, sa réalisation semble impossible <strong>faute de</strong> budget."</p>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-2">✅ Vous avez maintenant toutes les clés pour mieux construire vos textes à l'écrit.</p>
        </div>
      </div>
    `
  },
  {
    id: 6,
    titre: "MODULE III : L'ART DE LA NARRATION",
    duree: "30 min",
    description: "Le trio magique des temps du passé pour raconter comme un niveau C1.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">L'ART DE LA NARRATION</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Raconter sans ennuyer, le trio magique des temps du passé.</p>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-5 md:p-6 rounded-r-2xl mb-8">
          <p class="font-bold text-blue-900 mb-2">💡 Introduction</p>
          <p class="text-blue-800 text-sm md:text-base leading-relaxed mb-3">
            Raconter une histoire au TCF, ce n'est pas seulement aligner des verbes au passé composé. C'est mettre en scène un événement. Le correcteur doit visualiser la scène comme dans un film.
          </p>
          <p class="text-blue-800 text-sm md:text-base font-bold">Pour cela, vous devez maîtriser le "trio magique" des temps du passé : Passé Composé, Imparfait, Plus-que-parfait.</p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">1. Le Duo de base : Passé Composé vs Imparfait</h4>
        <p class="mb-4">C'est la base absolue. Une erreur ici et le niveau B2 s'envole.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-6">
          <div class="bg-blue-50 p-6 rounded-2xl border-2 border-blue-300">
            <p class="font-black text-blue-900 text-lg mb-1">Le Passé Composé</p>
            <p class="text-blue-700 font-bold text-sm mb-3">= L'Action ⚡</p>
            <p class="text-sm text-blue-800 mb-3">Ce qui fait <strong>avancer</strong> l'histoire. Actions ponctuelles, finies, avec un début et une fin.</p>
            <div class="bg-white p-3 rounded-lg border border-blue-200">
              <p class="text-xs font-bold text-blue-600 mb-1">Question à se poser :</p>
              <p class="text-xs italic text-blue-700">"Qu'est-ce qu'il s'est passé soudainement ?"</p>
            </div>
          </div>
          <div class="bg-purple-50 p-6 rounded-2xl border-2 border-purple-300">
            <p class="font-black text-purple-900 text-lg mb-1">L'Imparfait</p>
            <p class="text-purple-700 font-bold text-sm mb-3">= Le Décor 🎨</p>
            <p class="text-sm text-purple-800 mb-3">L'arrière-plan : la description, l'habitude, la météo, l'état d'esprit. L'histoire ne progresse pas.</p>
            <div class="bg-white p-3 rounded-lg border border-purple-200">
              <p class="text-xs font-bold text-purple-600 mb-1">Question à se poser :</p>
              <p class="text-xs italic text-purple-700">"Comment c'était ? Qu'est-ce qui était en train de se passer ?"</p>
            </div>
          </div>
        </div>

        <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-200 mb-8">
          <p class="font-black text-emerald-800 mb-2">🌟 L'Astuce TCF</p>
          <p class="text-sm text-emerald-800 mb-3">Ne commencez pas directement par l'action. Plantez le décor avec 2 ou 3 verbes à l'imparfait pour montrer que vous savez faire la distinction.</p>
          <div class="bg-white p-3 rounded-xl border border-emerald-200">
            <p class="text-sm italic text-emerald-900">"Il <strong>faisait</strong> beau, les oiseaux <strong>chantaient</strong> (Imparfait)... soudain, mon téléphone <strong>a sonné</strong> (Passé Composé)."</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">2. Le "Booster" de points : Le Plus-que-parfait</h4>
        <p class="mb-4">C'est le temps qui fait la différence entre un candidat "moyen" et un candidat "avancé" (C1).</p>

        <div class="bg-orange-50 p-5 rounded-xl border border-orange-200 mb-5">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="font-bold text-orange-900 mb-2">À quoi ça sert ?</p>
              <p class="text-sm text-orange-800">Parler du "passé dans le passé" : une action qui s'est déroulée <strong>avant</strong> l'action principale.</p>
            </div>
            <div>
              <p class="font-bold text-orange-900 mb-2">Formation :</p>
              <p class="text-sm text-orange-800"><strong>Auxiliaire (Avoir/Être) à l'IMPARFAIT + Participe Passé</strong></p>
              <p class="text-xs italic text-orange-700 mt-1">"J'avais mangé" / "Il était parti"</p>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto mb-8 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100">
              <tr><th class="p-4">Niveau</th><th class="p-4">Exemple</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr class="bg-red-50">
                <td class="p-4 font-bold text-red-700">Niveau A2</td>
                <td class="p-4 italic text-red-800">"Je suis arrivé à la gare. Le train est parti avant." <span class="not-italic text-slate-400">(deux phrases simples)</span></td>
              </tr>
              <tr class="bg-emerald-50">
                <td class="p-4 font-bold text-emerald-700">Niveau B2/C1 ✅</td>
                <td class="p-4 italic text-emerald-800">"Quand je suis arrivé à la gare, le train <strong>était déjà parti</strong>."</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bg-slate-900 text-white p-5 rounded-xl mb-8">
          <p class="font-bold text-orange-400 mb-2">🌟 Conseil Stratégique</p>
          <p class="text-sm text-slate-200">Essayez de placer au moins un plus-que-parfait dans votre récit (Tâche 2). Cela montre que vous maîtrisez la chronologie complexe.</p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">3. Rapporter les paroles (Le Discours Indirect au Passé)</h4>
        <p class="mb-4">Dans la Tâche 2, on vous demande souvent de raconter une rencontre. Attention au piège de la concordance des temps ! Si le verbe introducteur est au passé (<em>Il a dit que...</em>), tout change :</p>

        <div class="overflow-x-auto mb-8 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100 text-slate-600 uppercase tracking-widest text-xs">
              <tr><th class="p-4">Paroles originales (Direct)</th><th class="p-4">Dans votre récit (Indirect)</th><th class="p-4">La Règle</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-4 italic">"Je suis content."</td><td class="p-4">Il a dit qu'il <strong>était</strong> content.</td><td class="p-4 text-orange-600 font-bold">Présent → Imparfait</td></tr>
              <tr class="bg-slate-50"><td class="p-4 italic">"Je viendrai demain."</td><td class="p-4">Il a promis qu'il <strong>viendrait</strong> le lendemain.</td><td class="p-4 text-orange-600 font-bold">Futur → Conditionnel</td></tr>
              <tr><td class="p-4 italic">"J'ai fini le travail."</td><td class="p-4">Il m'a assuré qu'il <strong>avait fini</strong> le travail.</td><td class="p-4 text-orange-600 font-bold">Passé composé → Plus-que-parfait</td></tr>
              <tr class="bg-slate-50"><td class="p-4 italic">"Qu'est-ce que tu fais ?"</td><td class="p-4">Il m'a demandé ce que je <strong>faisais</strong>.</td><td class="p-4 text-orange-600 font-bold">Question → Affirmation</td></tr>
            </tbody>
          </table>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">4. Les Marqueurs Temporels</h4>
        <p class="mb-4">Dans un récit au passé, oubliez <em>"demain"</em> ou <em>"hier"</em>. Utilisez les termes du récit :</p>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div class="bg-slate-50 p-3 rounded-xl text-center border border-slate-200">
            <p class="text-xs text-slate-500">Hier</p>
            <p class="font-black text-slate-900 text-sm">→ La veille</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl text-center border border-slate-200">
            <p class="text-xs text-slate-500">Demain</p>
            <p class="font-black text-slate-900 text-sm">→ Le lendemain</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl text-center border border-slate-200">
            <p class="text-xs text-slate-500">Aujourd'hui</p>
            <p class="font-black text-slate-900 text-sm">→ Ce jour-là</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl text-center border border-slate-200">
            <p class="text-xs text-slate-500">Il y a 2 ans</p>
            <p class="font-black text-slate-900 text-sm">→ 2 ans auparavant</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">5. La Concordance des Temps (Le cas particulier des "SI")</h4>
        <p class="mb-4">C'est un automatisme à apprendre par cœur. Ce sont des "couples" qui ne se séparent jamais :</p>

        <div class="overflow-x-auto mb-8 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100 text-slate-600 uppercase tracking-widest text-xs">
              <tr><th class="p-4">Proposition avec "SI"</th><th class="p-4">Proposition principale</th><th class="p-4">Exemple</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-4 font-bold text-blue-700">Présent</td><td class="p-4 font-bold text-blue-700">Futur</td><td class="p-4 italic">"Si tu viens, je serai ravi."</td></tr>
              <tr class="bg-slate-50"><td class="p-4 font-bold text-purple-700">Imparfait</td><td class="p-4 font-bold text-purple-700">Conditionnel Présent</td><td class="p-4 italic">"Si tu venais, je serais ravi."</td></tr>
              <tr><td class="p-4 font-bold text-orange-700">Plus-que-parfait</td><td class="p-4 font-bold text-orange-700">Conditionnel Passé</td><td class="p-4 italic">"Si tu étais venu, j'aurais été ravi."</td></tr>
            </tbody>
          </table>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-orange-200 pb-2">🛠️ L'atelier pratique : Transformation TCF</h4>

        <div class="bg-red-50 p-5 rounded-xl border border-red-200 mb-4">
          <p class="font-bold text-red-800 text-xs uppercase mb-2">Narration A2 (Plate et répétitive) :</p>
          <p class="text-sm italic text-red-900">"L'année dernière je suis allé à Paris. J'ai vu la Tour Eiffel. C'est grand. Avant, j'ai mangé au restaurant. Mon ami a dit : je suis fatigué."</p>
        </div>
        <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-200 mb-8">
          <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Narration C1 (Riche et nuancée) :</p>
          <p class="text-sm text-emerald-900 font-medium">"L'année dernière, je me suis rendu à Paris. La Tour Eiffel <strong>était</strong> immense et majestueuse <span class="text-emerald-600">(Imparfait)</span>. Auparavant, nous <strong>avions déjeuné</strong> dans un bistrot typique <span class="text-emerald-600">(Plus-que-parfait)</span>. C'est alors que mon ami m'a avoué qu'il <strong>était</strong> fatigué par le voyage <span class="text-emerald-600">(Discours rapporté)</span>."</p>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-2">✅ Vous avez maintenant toutes les clés pour mieux construire vos textes à l'écrit.</p>
          <p class="text-sm text-slate-300">Passé Composé, Imparfait, Plus-que-parfait, le trio qui fait la différence entre un B1 et un C1.</p>
        </div>
      </div>
    `
  }
];

export const quizSemaine2: QuizQuestion[] = [
  {
    question: "Quel signe de ponctuation est considéré comme 'un signe de sophistication' car il relie deux propositions sans connecteur ?",
    options: ["La virgule (,)", "Le point-virgule (;)", "Les deux-points (:)", "Le tiret (—)"],
    reponseCorrecte: 1,
    explication: "Le point-virgule (;) sépare deux propositions indépendantes mais liées logiquement. Ex : 'Il ne voulait pas venir ; il était trop fatigué.' Cela remplace 'car' de façon élégante."
  },
  {
    question: "À quoi servent les guillemets (« ») dans un texte ?",
    options: ["À marquer une pause courte", "À rapporter des paroles, encadrer une citation ou marquer l'ironie", "À exprimer une liste", "À indiquer une action soudaine"],
    reponseCorrecte: 1,
    explication: "Les guillemets encadrent une citation, rapportent des paroles, ou mettent en relief un mot avec ironie ou d'une langue étrangère."
  },
  {
    question: "La structure 'Bien que + ___' est considérée comme 'l'arme absolue' des connecteurs d'opposition.",
    options: ["Indicatif", "Infinitif", "Subjonctif", "Conditionnel"],
    reponseCorrecte: 2,
    explication: "'Bien que le télétravail SOIT pratique...', Le subjonctif est obligatoire après 'Bien que'. C'est une structure de niveau B2/C1 très appréciée des correcteurs."
  },
  {
    question: "Lequel de ces connecteurs est le plus élégant à l'écrit pour marquer l'opposition ?",
    options: ["Mais", "Par contre", "En revanche", "Pourtant"],
    reponseCorrecte: 2,
    explication: "'En revanche' est préféré à 'Par contre' dans un contexte écrit formel. 'Mais' et 'Pourtant' sont des niveaux A2/B1."
  },
  {
    question: "Comment exprimer 'parce qu'il n'avait pas le temps' en niveau C1 ?",
    options: ["'Vu qu'il n'avait pas le temps'", "'Faute de temps'", "'Car il n'avait pas le temps'", "'Puisqu'il n'avait pas le temps'"],
    reponseCorrecte: 1,
    explication: "'Faute de + nom' est une structure de niveau C1. 'Il n'a pas fini, faute de temps.' C'est plus élégant et précis que 'parce qu'il n'avait pas le temps'."
  },
  {
    question: "Quelle structure organise le mieux un paragraphe pour présenter deux aspects d'un problème ?",
    options: ["'Et aussi... Et puis...'", "'D'une part... D'autre part...'", "'Premièrement... Ensuite...'", "'Moi je pense... Mais aussi...'"],
    reponseCorrecte: 1,
    explication: "'D'une part... D'autre part...' structure visuellement votre paragraphe et plaît beaucoup aux correcteurs du TCF. C'est une marque de niveau B2/C1."
  },
  {
    question: "En narration, quel temps utilise-t-on pour décrire le décor, l'ambiance ou les habitudes passées ?",
    options: ["Le Passé Composé", "Le Futur Antérieur", "L'Imparfait", "Le Plus-que-parfait"],
    reponseCorrecte: 2,
    explication: "L'Imparfait est le 'décor' de l'histoire. Il décrit l'arrière-plan, les habitudes, la météo, l'état d'esprit. Le Passé Composé fait avancer l'action."
  },
  {
    question: "Quelle est la formation correcte du Plus-que-parfait ?",
    options: ["Avoir/Être au Présent + Participe Passé", "Avoir/Être à l'Imparfait + Participe Passé", "Avoir/Être au Conditionnel + Participe Passé", "Verbe conjugué au Passé Simple"],
    reponseCorrecte: 1,
    explication: "Le Plus-que-parfait = auxiliaire (avoir/être) à l'IMPARFAIT + Participe Passé. Ex : 'j'avais mangé', 'il était parti'."
  },
  {
    question: "Le Plus-que-parfait sert à parler de :",
    options: ["Une action qui se passe après l'action principale", "Une action qui se passe en même temps que l'action principale", "Une action qui s'est déroulée AVANT l'action principale", "Une habitude dans le passé"],
    reponseCorrecte: 2,
    explication: "Le Plus-que-parfait = le 'passé dans le passé'. Ex : 'Quand je suis arrivé, le train était déjà parti.' Le départ du train est antérieur à l'arrivée."
  },
  {
    question: "Au discours indirect au passé, 'Je viendrai demain' devient :",
    options: ["Il a dit qu'il viendra le lendemain.", "Il a dit qu'il venait le lendemain.", "Il a promis qu'il viendrait le lendemain.", "Il a promis qu'il était venu le lendemain."],
    reponseCorrecte: 2,
    explication: "Futur → Conditionnel au discours indirect au passé. Et 'demain' devient 'le lendemain' car le moment de référence a changé."
  },
  {
    question: "Pour la concordance des temps avec 'SI' : Si + imparfait → la proposition principale est au :",
    options: ["Futur simple", "Présent", "Conditionnel présent", "Conditionnel passé"],
    reponseCorrecte: 2,
    explication: "C'est le couple immuable : SI + Imparfait → Conditionnel présent. Ex : 'Si tu venais, je serais ravi.' Ces couples ne se séparent jamais !"
  },
  {
    question: "Dans un récit au passé, le mot 'aujourd'hui' se remplace par :",
    options: ["'Maintenant'", "'Ce jour-là'", "'En ce temps'", "'À ce moment futur'"],
    reponseCorrecte: 1,
    explication: "Les marqueurs temporels changent au discours indirect et dans le récit au passé : Aujourd'hui → Ce jour-là, Hier → La veille, Demain → Le lendemain."
  },
  {
    question: "Quel connecteur de conséquence est considéré comme beaucoup plus 'professionnel' que 'c'est pour ça que' ?",
    options: ["'Donc'", "'Alors'", "'C'est la raison pour laquelle'", "'Par contre'"],
    reponseCorrecte: 2,
    explication: "'C'est la raison pour laquelle' est de niveau C1. 'Donc' et 'Alors' sont corrects mais basiques (B1). 'Par contre' est un connecteur d'opposition, pas de conséquence."
  },
  {
    question: "Les points de suspension (...) servent principalement à :",
    options: ["Marquer une liste complète", "Exprimer le suspense, l'inachevé ou le sous-entendu", "Remplacer un connecteur logique", "Indiquer une citation"],
    reponseCorrecte: 1,
    explication: "Les points de suspension créent le suspense, l'hésitation ou laissent le lecteur deviner la suite. Ex : 'Tout le monde était là : mon père, mon frère, ma mère…'"
  },
  {
    question: "Quel est le 'booster de points' qui distingue un candidat de niveau C1 en narration, selon ce module ?",
    options: ["L'utilisation du présent de narration", "Le passé simple", "Le Plus-que-parfait placé dans le récit", "La voix passive"],
    reponseCorrecte: 2,
    explication: "Placer au moins un plus-que-parfait dans votre Tâche 2 prouve que vous maîtrisez la chronologie complexe. C'est ce qui fait passer de 'moyen' à 'avancé (C1)'."
  }
];
