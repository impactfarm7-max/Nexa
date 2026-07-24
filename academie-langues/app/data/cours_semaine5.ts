import { CoursModule, QuizQuestion } from "./cours_semaine1";

export const coursSemaine5: CoursModule[] = [
  {
    id: 11,
    titre: "MODULE 1 : COMPRENDRE LES MÉCANISMES DU STRESS AU TCF",
    duree: "20 min",
    description: "Transformer la peur en une série de défis techniques identifiables pour ne plus subir le stress, le comprendre.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">COMPRENDRE LES MÉCANISMES DU STRESS AU TCF</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Transformer une émotion abstraite (la peur) en une série de défis techniques identifiables.</p>

        <div class="bg-amber-50 border-l-4 border-amber-500 p-5 md:p-6 rounded-r-2xl mb-8">
          <p class="font-bold text-amber-900 mb-2">💡 Introduction</p>
          <p class="text-amber-800 text-sm md:text-base leading-relaxed">
            Réussir le TCF Canada ne dépend pas uniquement de votre niveau de grammaire ou de l'étendue de votre vocabulaire. Chaque année, des candidats d'excellent niveau voient leurs scores chuter à cause d'un facteur unique : <strong>le stress paralysant</strong>.
          </p>
          <p class="text-amber-800 text-sm md:text-base leading-relaxed mt-3">
            Le stress est une énergie. L'objectif de ce cours n'est pas de le supprimer totalement, ce qui est impossible, mais de le <strong>transformer en un moteur de concentration</strong> pour atteindre votre objectif.
          </p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">1. Pourquoi le TCF Canada génère-t-il autant de stress ?</h4>
        <p class="mb-4">Le stress au TCF n'est pas un signe de faiblesse, c'est une réaction logique à trois facteurs combinés :</p>

        <div class="space-y-3 mb-8">
          <div class="flex gap-4 p-5 bg-white rounded-xl border border-slate-200">
            <span class="text-2xl shrink-0">🎯</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">L'Enjeu (L'hypersensibilité au résultat)</p>
              <p class="text-sm text-slate-600">Le candidat ne joue pas seulement une note, mais souvent son projet de vie, son visa ou son expatriation.</p>
            </div>
          </div>
          <div class="flex gap-4 p-5 bg-white rounded-xl border border-slate-200">
            <span class="text-2xl shrink-0">❓</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">L'Imprévisibilité</p>
              <p class="text-sm text-slate-600">Ne pas savoir sur quel sujet on va tomber en Expression Orale ou Écrite crée une attente anxieuse.</p>
            </div>
          </div>
          <div class="flex gap-4 p-5 bg-white rounded-xl border border-slate-200">
            <span class="text-2xl shrink-0">⏱️</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">La Contrainte Temporelle</p>
              <p class="text-sm text-slate-600">Le TCF est un test de vitesse. Le décompte incessant des minutes sur l'écran agit comme un stimulus de stress permanent.</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">2. Le Cycle de la Panique en Examen</h4>
        <p class="mb-4">Il est crucial de comprendre comment le stress sabote vos capacités :</p>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div class="bg-red-50 p-4 rounded-xl border border-red-200 text-center">
            <span class="text-2xl block mb-2">⚡</span>
            <p class="text-xs font-black text-red-700 uppercase mb-1">① Le Signal</p>
            <p class="text-xs text-red-600">Une question difficile apparaît.</p>
          </div>
          <div class="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center">
            <span class="text-2xl block mb-2">💓</span>
            <p class="text-xs font-black text-orange-700 uppercase mb-1">② Réaction Physique</p>
            <p class="text-xs text-orange-600">Le cœur accélère, la respiration devient courte.</p>
          </div>
          <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
            <span class="text-2xl block mb-2">🧠</span>
            <p class="text-xs font-black text-amber-700 uppercase mb-1">③ Blocage Cognitif</p>
            <p class="text-xs text-amber-600">Le cerveau bascule en mode "survie". Perte du vocabulaire et des règles.</p>
          </div>
          <div class="bg-slate-100 p-4 rounded-xl border border-slate-300 text-center">
            <span class="text-2xl block mb-2">🌀</span>
            <p class="text-xs font-black text-slate-700 uppercase mb-1">④ Effet Domino</p>
            <p class="text-xs text-slate-600">On perd du temps → plus de stress → encore plus de temps perdu.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">3. La "Courbe de Performance" (Loi de Yerkes-Dodson)</h4>
        <p class="mb-4">Le stress n'est pas votre ennemi juré, mais <strong>un outil mal réglé</strong>.</p>

        <div class="grid md:grid-cols-3 gap-4 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200 text-center">
            <p class="font-black text-blue-800 mb-2">😴 Stress trop bas</p>
            <p class="text-sm text-blue-700">Ennui, inattention, erreurs d'étourdissement.</p>
          </div>
          <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 text-center ring-2 ring-emerald-400">
            <p class="font-black text-emerald-800 mb-2">⚡ Stress optimal</p>
            <p class="text-sm text-emerald-700">Vigilance accrue, rapidité de lecture, mobilisation des acquis.</p>
            <span class="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full mt-2 inline-block">OBJECTIF</span>
          </div>
          <div class="bg-red-50 p-5 rounded-2xl border border-red-200 text-center">
            <p class="font-black text-red-800 mb-2">🚨 Stress trop haut</p>
            <p class="text-sm text-red-700">"Trou noir", incapacité à écrire ou parler.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">4. La Structure de l'Examen comme Ancrage</h4>
        <p class="mb-4">Pour contrer l'inconnu, ancrez-vous dans la structure rigide du test :</p>

        <div class="overflow-x-auto mb-8 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100 text-slate-600 uppercase tracking-widest text-xs">
              <tr><th class="p-4">Épreuve</th><th class="p-4">Durée</th><th class="p-4">Questions</th><th class="p-4">Le Défi</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-4 font-bold text-orange-700">Compréhension Orale</td><td class="p-4">35 min</td><td class="p-4">40</td><td class="p-4 italic text-slate-600">L'écoute unique.</td></tr>
              <tr class="bg-slate-50"><td class="p-4 font-bold text-orange-700">Compréhension Écrite</td><td class="p-4">60 min</td><td class="p-4">40</td><td class="p-4 italic text-slate-600">La gestion du temps sur la fin.</td></tr>
              <tr><td class="p-4 font-bold text-orange-700">Expression Écrite</td><td class="p-4">60 min</td><td class="p-4">3 tâches</td><td class="p-4 italic text-slate-600">La longueur et la cohérence.</td></tr>
              <tr class="bg-slate-50"><td class="p-4 font-bold text-orange-700">Expression Orale</td><td class="p-4">12 min</td><td class="p-4">3 tâches</td><td class="p-4 italic text-slate-600">L'interaction humaine et le direct.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-3">🎯 Exercice pratique</p>
          <p class="text-sm text-slate-300">Identifiez votre "point de rupture". Est-ce le bruit des autres candidats qui tapent au clavier ? Est-ce le moment où vous ne comprenez pas un mot dans un audio ? <strong class="text-white">Nommer sa peur, c'est déjà la maîtriser.</strong></p>
        </div>
      </div>
    `
  },
  {
    id: 12,
    titre: "MODULE 2 : STRATÉGIES DE PRÉPARATION (L'AMONT)",
    duree: "25 min",
    description: "Transformer les compétences linguistiques en réflexes automatiques pour qu'elles ne disparaissent pas sous l'effet du stress.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">STRATÉGIES DE PRÉPARATION (L'AMONT)</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Transformer les compétences linguistiques en <strong>réflexes automatiques</strong> pour qu'elles ne disparaissent pas sous l'effet du stress.</p>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">1. La Simulation en Conditions "Dégradées"</h4>
        <p class="mb-4">S'entraîner dans le calme absolu d'une bibliothèque est une erreur. Le jour J, il y aura du bruit, des gens qui bougent et un chronomètre stressant.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-2">⏱️ L'entraînement fractionné</p>
            <p class="text-sm text-blue-800">Faire des séries de questions de compréhension en réduisant volontairement le temps imparti de <strong>10%</strong>. Cela crée une "marge de sécurité" psychologique pour le jour de l'examen.</p>
          </div>
          <div class="bg-purple-50 p-5 rounded-2xl border border-purple-200">
            <p class="font-black text-purple-900 mb-2">🎧 L'immersion sonore</p>
            <p class="text-sm text-purple-800">S'entraîner à l'Expression Écrite avec un fond sonore (bruit de café ou de bureau) pour apprendre à s'isoler mentalement.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">2. La Création de "Banques de Secours"</h4>
        <p class="mb-4">Le stress paralyse la créativité. Il faut donc avoir des structures <strong>prêtes à l'emploi</strong>.</p>

        <div class="space-y-3 mb-8">
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-2">Les connecteurs logiques "Passe-partout"</p>
            <p class="text-sm text-slate-600 mb-3">Maîtriser parfaitement 5 ou 6 connecteurs pour toutes les situations :</p>
            <div class="flex flex-wrap gap-2">
              <span class="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">Cependant</span>
              <span class="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">Par ailleurs</span>
              <span class="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">Nonobstant</span>
              <span class="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">En revanche</span>
              <span class="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">Néanmoins</span>
              <span class="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">Force est de constater</span>
            </div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-900 mb-2">Les amorces de phrases (Expression Orale)</p>
            <p class="text-sm text-slate-600 mb-3">Avoir des phrases de lancement automatiques pour chaque tâche :</p>
            <div class="space-y-2">
              <p class="text-sm italic text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">"C'est une question très intéressante..."</p>
              <p class="text-sm italic text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">"Je partage globalement cet avis, toutefois..."</p>
            </div>
            <p class="text-xs text-emerald-700 font-bold mt-3">💡 Gain : 5 à 10 secondes de réflexion tout en continuant à parler.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">3. La Technique du "Brouillon Stratégique"</h4>
        <p class="mb-4">Apprendre à ne pas tout écrire.</p>

        <div class="bg-amber-50 p-5 rounded-xl border border-amber-200 mb-8">
          <p class="font-bold text-amber-900 mb-2">En Expression Orale (Tâche 2)</p>
          <p class="text-sm text-amber-800">Noter uniquement des <strong>mots-clés et des arguments chocs</strong>. Trop de notes au brouillon poussent le candidat à lire, ce qui fait perdre des points de fluidité et augmente le stress.</p>
          <div class="grid md:grid-cols-2 gap-3 mt-3">
            <div class="bg-red-50 p-3 rounded-lg border border-red-100">
              <p class="text-xs font-bold text-red-700 mb-1">❌ Éviter</p>
              <p class="text-xs text-red-700">Rédiger des phrases complètes au brouillon → lecture robotique.</p>
            </div>
            <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p class="text-xs font-bold text-emerald-700 mb-1">✅ Faire</p>
              <p class="text-xs text-emerald-700">3-4 mots-clés par argument → discours naturel et fluide.</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">4. L'Hygiène de la Préparation (La règle des 48h)</h4>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-2">🛑 J-2 : Arrêt des révisions intensives</p>
            <p class="text-sm text-blue-800">Le cerveau a besoin de consolider les acquis. S'acharner les derniers jours est contre-productif et épuisant.</p>
          </div>
          <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
            <p class="font-black text-emerald-900 mb-2">🧘 Visualisation positive</p>
            <p class="text-sm text-emerald-800">S'imaginer dans la salle, calme, répondant avec assurance. Le cerveau ne fait pas bien la différence entre un souvenir réel et une visualisation précise.</p>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-3">🎯 Exercice pratique : "Le défi du chrono"</p>
          <p class="text-sm text-slate-300">Prenez un sujet d'Expression Écrite (Tâche 1) et traitez-le en <strong class="text-white">8 minutes au lieu de 10</strong>. Cette habitude crée une "marge de sécurité" psychologique pour le jour de l'examen.</p>
        </div>
      </div>
    `
  },
  {
    id: 13,
    titre: "MODULE 3 : TECHNIQUES DE GESTION LE JOUR DE L'EXAMEN",
    duree: "25 min",
    description: "Techniques d'intervention immédiate pour reprendre le contrôle dès que le stress dépasse le seuil optimal.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">TECHNIQUES DE GESTION LE JOUR DE L'EXAMEN</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Fournir des techniques d'intervention immédiate pour reprendre le contrôle dès que le stress dépasse le seuil optimal.</p>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">1. La Maîtrise Physiologique : Le Bouton "Reset"</h4>
        <p class="mb-4">Le stress bloque la respiration et crispe les muscles, envoyant un signal de danger au cerveau.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-3">🫁 La respiration 4-7-8</p>
            <p class="text-sm text-blue-800 mb-4">Une technique discrète utilisable devant l'écran. Cela force le système nerveux à se calmer.</p>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-white p-3 rounded-lg border border-blue-100 text-center">
                <p class="text-2xl font-black text-blue-700">4</p>
                <p class="text-[10px] text-blue-600 font-bold">Inspirer</p>
              </div>
              <div class="bg-white p-3 rounded-lg border border-blue-100 text-center">
                <p class="text-2xl font-black text-blue-700">7</p>
                <p class="text-[10px] text-blue-600 font-bold">Bloquer</p>
              </div>
              <div class="bg-white p-3 rounded-lg border border-blue-100 text-center">
                <p class="text-2xl font-black text-blue-700">8</p>
                <p class="text-[10px] text-blue-600 font-bold">Expirer</p>
              </div>
            </div>
          </div>
          <div class="bg-orange-50 p-5 rounded-2xl border border-orange-200">
            <p class="font-black text-orange-900 mb-2">🦶 L'ancrage physique</p>
            <p class="text-sm text-orange-800">En cas de panique, poser les deux pieds bien à plat sur le sol et sentir le contact de la chaise. Cela aide à sortir du "tourbillon de pensées" pour revenir au moment présent.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">2. La Gestion Tactique du Temps (Interface TCF)</h4>
        <p class="mb-4">Le chronomètre qui défile en rouge est le plus gros facteur de stress.</p>

        <div class="space-y-3 mb-8">
          <div class="bg-red-50 p-5 rounded-xl border border-red-200">
            <p class="font-bold text-red-900 mb-2">⚡ La règle de l'abandon stratégique</p>
            <p class="text-sm text-red-800">En Compréhension Écrite ou Orale, si une question est trop difficile : <strong>choisir une réponse au hasard et passer à la suivante immédiatement</strong>.</p>
            <div class="bg-white p-3 rounded-lg border border-red-100 mt-3">
              <p class="text-xs font-black text-red-700">⚠️ Rappel important</p>
              <p class="text-xs text-red-700 mt-1">Il n'y a <strong>pas de points négatifs</strong> au TCF. S'acharner sur une question fait perdre le calme nécessaire pour les questions faciles qui suivent.</p>
            </div>
          </div>
          <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
            <p class="font-bold text-blue-900 mb-2">👁️ La lecture "Vigilante"</p>
            <p class="text-sm text-blue-800">Apprendre à lire la question <strong>avant</strong> d'écouter l'audio ou de lire le texte. Savoir ce que l'on cherche réduit l'anxiété liée à la masse d'informations.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">3. Le Protocole "Anti-Trou Noir"</h4>
        <p class="mb-4">Que faire si, en pleine expression, le cerveau se vide ?</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <p class="font-black text-slate-900 mb-3">✍️ À l'écrit</p>
            <ul class="space-y-2 text-sm text-slate-700">
              <li class="flex items-start gap-2"><span class="text-orange-500 font-bold shrink-0">→</span> Revenir au plan.</li>
              <li class="flex items-start gap-2"><span class="text-orange-500 font-bold shrink-0">→</span> Relire la dernière phrase écrite pour relancer la machine.</li>
              <li class="flex items-start gap-2"><span class="text-orange-500 font-bold shrink-0">→</span> Si un mot manque, utiliser un synonyme plus simple. La priorité est la <strong>continuité</strong>.</li>
            </ul>
          </div>
          <div class="bg-amber-50 p-5 rounded-2xl border border-amber-200">
            <p class="font-black text-amber-900 mb-3">🎤 À l'oral</p>
            <p class="text-sm text-amber-800 mb-3">Utiliser des "phrases tampons" pour gagner 3 secondes de répit :</p>
            <p class="text-sm italic text-amber-700 bg-white p-3 rounded-lg border border-amber-100">"C'est un point complexe, laissez-moi reformuler ma pensée..."</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">4. La Gestion des Pauses et des Transitions</h4>

        <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-200 mb-8">
          <p class="font-bold text-emerald-900 mb-2">🧹 Le "nettoyage mental"</p>
          <p class="text-sm text-emerald-800">Une épreuve ratée doit être <strong>oubliée instantanément</strong>. Ne pas laisser la frustration de la compréhension orale polluer l'expression écrite. <strong>Chaque épreuve est un nouveau départ.</strong></p>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-3">Les 3 piliers du Jour J</p>
          <div class="grid md:grid-cols-3 gap-4">
            <div class="bg-white/10 p-4 rounded-xl">
              <p class="font-black text-white mb-1">🎛️ Contrôle</p>
              <p class="text-xs text-slate-300">Utilisez la respiration 4-7-8 dès que le rythme s'accélère.</p>
            </div>
            <div class="bg-white/10 p-4 rounded-xl">
              <p class="font-black text-white mb-1">💪 Confiance</p>
              <p class="text-xs text-slate-300">Appuyez-vous sur vos structures automatiques et vos connecteurs logiques.</p>
            </div>
            <div class="bg-white/10 p-4 rounded-xl">
              <p class="font-black text-white mb-1">🎯 Concentration</p>
              <p class="text-xs text-slate-300">L'épreuve précédente est passée, l'épreuve suivante n'existe pas encore.</p>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 14,
    titre: "MODULE 4 : FOCUS SUR L'EXPRESSION ORALE (LE FACE-À-FACE)",
    duree: "25 min",
    description: "Désamorcer la peur du jugement et de l'examinateur pour libérer la parole et performer en direct.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">FOCUS SUR L'EXPRESSION ORALE</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Désamorcer la peur du jugement et de l'examinateur pour libérer la parole.</p>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">1. Changer de Perspective : L'Examinateur est un Partenaire</h4>
        <p class="mb-4">L'examinateur n'est pas là pour vous piéger, mais pour évaluer votre capacité à communiquer.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-2">Le rôle de l'examinateur</p>
            <p class="text-sm text-blue-800">Il a besoin que vous parliez pour pouvoir vous mettre des points. <strong>S'il vous relance, ce n'est pas une critique, c'est une aide.</strong></p>
          </div>
          <div class="bg-orange-50 p-5 rounded-2xl border border-orange-200">
            <p class="font-black text-orange-900 mb-2">La "Relation Client"</p>
            <p class="text-sm text-orange-800">Voyez l'examinateur comme un collègue ou un client. Cela impose naturellement un registre de langue soutenu tout en gardant une courtoisie qui réduit l'agressivité du stress.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">2. Maîtriser le Langage Non-Verbal (La Posture de Confiance)</h4>
        <p class="mb-4">Le corps influence l'esprit. Si le candidat se recroqueville, son cerveau reçoit un signal de peur.</p>

        <div class="grid md:grid-cols-3 gap-4 mb-8">
          <div class="bg-white p-5 rounded-xl border border-slate-200 text-center">
            <span class="text-3xl block mb-3">👁️</span>
            <p class="font-bold text-slate-900 mb-2">Le contact visuel</p>
            <p class="text-xs text-slate-600">Regarder l'examinateur (ou la caméra) montre que l'on maîtrise la situation.</p>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200 text-center">
            <span class="text-3xl block mb-3">🙌</span>
            <p class="font-bold text-slate-900 mb-2">La gestion des mains</p>
            <p class="text-xs text-slate-600">Utiliser ses mains pour ponctuer ses arguments aide à libérer l'énergie nerveuse et donne du dynamisme.</p>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200 text-center">
            <span class="text-3xl block mb-3">😊</span>
            <p class="font-bold text-slate-900 mb-2">Le sourire</p>
            <p class="text-xs text-slate-600">Un léger sourire détend les cordes vocales et rend la voix plus claire et plus assurée.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">3. Gérer les 3 Tâches sans Paniquer</h4>

        <div class="space-y-3 mb-8">
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <div class="flex items-center gap-3 mb-3">
              <span class="bg-orange-100 text-orange-700 text-xs font-black px-3 py-1 rounded-full uppercase">Tâche 1</span>
              <p class="font-bold text-slate-900">Entretien dirigé, L'échauffement</p>
            </div>
            <p class="text-sm text-slate-600 mb-2">Le but est d'être naturel.</p>
            <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p class="text-xs font-bold text-emerald-700 mb-1">💡 Astuce anti-stress</p>
              <p class="text-xs text-emerald-700">Ne jamais répondre par "oui" ou "non". Toujours développer un minimum pour entrer dans le rythme.</p>
            </div>
          </div>
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <div class="flex items-center gap-3 mb-3">
              <span class="bg-orange-100 text-orange-700 text-xs font-black px-3 py-1 rounded-full uppercase">Tâche 2</span>
              <p class="font-bold text-slate-900">Interaction, Le jeu de rôle</p>
            </div>
            <p class="text-sm text-slate-600 mb-2">Le candidat doit prendre l'initiative.</p>
            <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p class="text-xs font-bold text-emerald-700 mb-1">💡 Astuce anti-stress</p>
              <p class="text-xs text-emerald-700">Préparer 3 ou 4 questions types (coûts, horaires, avantages) qui fonctionnent pour presque tous les sujets.</p>
            </div>
          </div>
          <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 ring-2 ring-orange-200">
            <div class="flex items-center gap-3 mb-3">
              <span class="bg-orange-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase">Tâche 3</span>
              <p class="font-bold text-slate-900">Expression d'un point de vue, La plus complexe</p>
            </div>
            <p class="text-sm text-slate-600 mb-2">C'est la tâche la plus valorisée par les correcteurs.</p>
            <div class="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <p class="text-xs font-bold text-orange-700 mb-2">💡 Structure anti-panique</p>
              <div class="flex items-center gap-2 text-xs font-black text-orange-800">
                <span class="bg-orange-200 px-2 py-1 rounded">AFFIRMATION</span>
                <span>→</span>
                <span class="bg-orange-200 px-2 py-1 rounded">EXEMPLE</span>
                <span>→</span>
                <span class="bg-orange-200 px-2 py-1 rounded">CONCLUSION</span>
              </div>
              <p class="text-xs text-orange-700 mt-2">Suivre un plan rigide évite de s'égarer et de perdre ses mots.</p>
            </div>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">4. La Gestion de l'Erreur en Direct</h4>
        <p class="mb-4">Le plus grand stress est de faire une faute de grammaire et de s'arrêter net.</p>

        <div class="grid md:grid-cols-2 gap-5 mb-8">
          <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
            <p class="font-black text-emerald-900 mb-2">✅ L'auto-correction fluide</p>
            <p class="text-sm text-emerald-800 mb-2">Si on se trompe, se corriger immédiatement avec un sourire :</p>
            <p class="text-sm italic text-emerald-700 bg-white p-3 rounded-lg border border-emerald-100">"Pardon, je voulais dire..."</p>
            <p class="text-xs text-emerald-600 mt-2">L'examinateur valorise souvent l'auto-correction car elle prouve une conscience linguistique.</p>
          </div>
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <p class="font-black text-blue-900 mb-2">⏳ Le droit à l'hésitation</p>
            <p class="text-sm text-blue-800 mb-2">Utiliser des locutions pour gagner du temps :</p>
            <p class="text-sm italic text-blue-700 bg-white p-3 rounded-lg border border-blue-100">"C'est une perspective intéressante, si l'on regarde les choses sous un autre angle..."</p>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl">
          <p class="font-bold text-orange-400 mb-3">🎯 Exercice pratique : "Le miroir"</p>
          <p class="text-sm text-slate-300 mb-4">Filmez-vous en train de répondre à une question de Tâche 3. En vous regardant, vous réaliserez souvent que vos hésitations sont moins "graves" que vous ne le pensiez, ce qui renforce votre confiance.</p>
          <p class="text-xs text-orange-300 font-bold uppercase tracking-widest">Le TCF Canada est une porte vers votre avenir. Votre mental est votre meilleur allié.</p>
        </div>
      </div>
    `
  }
];

export const quizSemaine5: QuizQuestion[] = [
  {
    question: "Selon la Loi de Yerkes-Dodson, quel niveau de stress est optimal pour performer au TCF ?",
    options: [
      "Un stress nul, être totalement détendu garantit les meilleures performances",
      "Un stress modéré, il augmente la vigilance et mobilise les acquis sans provoquer de blocage",
      "Un stress élevé, la pression maximale pousse à donner le meilleur de soi",
      "Le stress n'a aucun impact sur les performances linguistiques"
    ],
    reponseCorrecte: 1,
    explication: "La Loi de Yerkes-Dodson distingue trois niveaux : stress trop bas (ennui, erreurs d'étourdissement), stress optimal (vigilance, rapidité, mobilisation des acquis) et stress trop haut ou détresse (trou noir, incapacité à écrire ou parler). L'objectif est de maintenir le stress dans la zone optimale."
  },
  {
    question: "Quel est le 4e stade du 'cycle de la panique en examen' ?",
    options: [
      "Le Blocage Cognitif, le cerveau bascule en mode survie",
      "La Réaction Physique, le cœur accélère",
      "L'Effet Domino, on perd du temps, ce qui augmente le stress",
      "Le Signal, une question difficile apparaît"
    ],
    reponseCorrecte: 2,
    explication: "Le cycle se déroule en 4 étapes : ① Le Signal (question difficile), ② La Réaction Physique (cœur qui accélère), ③ Le Blocage Cognitif (perte d'accès au vocabulaire), ④ L'Effet Domino (perte de temps → plus de stress → encore plus de temps perdu). Comprendre ce cycle permet de l'interrompre dès le stade 2."
  },
  {
    question: "Pourquoi la technique de 'l'entraînement fractionné' consiste-t-elle à réduire le temps imparti de 10% ?",
    options: [
      "Pour s'entraîner plus vite et couvrir plus de contenu",
      "Pour créer une marge de sécurité psychologique le jour de l'examen",
      "Parce que le TCF impose en réalité un temps réduit de 10%",
      "Pour habituer le cerveau à ignorer le chronomètre"
    ],
    reponseCorrecte: 1,
    explication: "S'entraîner avec moins de temps crée une 'marge de sécurité' psychologique. Le jour J, quand le chronomètre tourne, le candidat a l'impression d'avoir plus de temps que d'habitude, ce qui réduit mécaniquement le stress lié à la contrainte temporelle."
  },
  {
    question: "Que doit-on faire si une question de Compréhension Écrite est trop difficile ?",
    options: [
      "Rester dessus jusqu'à trouver la réponse, coûte que coûte",
      "Laisser la question sans réponse pour ne pas risquer de se tromper",
      "Choisir une réponse au hasard et passer immédiatement à la suivante",
      "Revenir à cette question à la fin si le temps le permet"
    ],
    reponseCorrecte: 2,
    explication: "La règle de l'abandon stratégique : au TCF, il n'y a pas de points négatifs. S'acharner sur une question difficile fait perdre du temps ET du calme, deux ressources précieuses pour réussir les questions faciles qui suivent. La bonne réponse est de choisir au hasard et de continuer."
  },
  {
    question: "Quelle est la bonne séquence pour la technique de respiration anti-stress du TCF ?",
    options: [
      "Inspirer 7 secondes, bloquer 4 secondes, expirer 8 secondes",
      "Inspirer 4 secondes, bloquer 7 secondes, expirer 8 secondes",
      "Inspirer 8 secondes, bloquer 4 secondes, expirer 7 secondes",
      "Inspirer 4 secondes, expirer 8 secondes, bloquer 7 secondes"
    ],
    reponseCorrecte: 1,
    explication: "La respiration 4-7-8 : Inspirer 4 secondes → Bloquer 7 secondes → Expirer 8 secondes. Ce schéma force le système nerveux parasympathique à prendre le dessus, ce qui réduit physiologiquement le rythme cardiaque et calme le cerveau. Elle est discrète et utilisable pendant l'examen."
  },
  {
    question: "Quelle structure doit-on utiliser pour la Tâche 3 de l'Expression Orale ?",
    options: [
      "INTRODUCTION, DÉVELOPPEMENT, CONCLUSION",
      "QUESTION, RÉPONSE, EXEMPLE",
      "AFFIRMATION, EXEMPLE, CONCLUSION",
      "THÈSE, ANTITHÈSE, SYNTHÈSE"
    ],
    reponseCorrecte: 2,
    explication: "Pour la Tâche 3 (Expression d'un point de vue), la structure anti-panique recommandée est AFFIRMATION → EXEMPLE → CONCLUSION. Ce plan rigide évite de s'égarer et de perdre ses mots sous l'effet du stress. Il permet aussi de structurer sa pensée rapidement même en situation de pression."
  },
  {
    question: "Comment doit-on réagir si on fait une faute de grammaire à l'oral ?",
    options: [
      "S'arrêter, s'excuser longuement et recommencer depuis le début",
      "Ignorer la faute et continuer sans la signaler",
      "Se corriger immédiatement avec un sourire : 'Pardon, je voulais dire...' et continuer",
      "Demander à l'examinateur si l'on a fait une erreur"
    ],
    reponseCorrecte: 2,
    explication: "L'auto-correction fluide est valorisée par les examinateurs car elle prouve une conscience linguistique. S'arrêter net ou s'excuser longuement aggrave le stress et interrompt le flux de la communication. La bonne attitude est de se corriger naturellement avec un sourire et de poursuivre."
  },
  {
    question: "Pourquoi la règle des 48h recommande-t-elle d'arrêter les révisions intensives à J-2 ?",
    options: [
      "Pour reposer le corps avant l'effort physique de l'examen",
      "Parce que le cerveau a besoin de consolider les acquis, et que réviser en dernier lieu est contre-productif",
      "Parce que les informations apprises à J-2 interfèrent avec les acquis antérieurs",
      "Pour avoir le temps de préparer ses affaires et se détendre"
    ],
    reponseCorrecte: 1,
    explication: "La consolidation mémorielle se fait pendant le repos, pas pendant la révision intensive. S'acharner les dernières 48h avant l'examen crée de la fatigue et de l'anxiété sans apporter de bénéfice linguistique réel. Le cerveau a besoin de temps pour 'fixer' les apprentissages en mémoire à long terme."
  },
  {
    question: "Quel est l'objectif des 'amorces de phrases' pour l'Expression Orale ?",
    options: [
      "Impressionner l'examinateur avec un vocabulaire sophistiqué dès le départ",
      "Gagner 5 à 10 secondes de réflexion tout en continuant à parler, sans silence gênant",
      "Remplacer le contenu de la réponse quand on ne sait pas quoi dire",
      "Structurer la réponse en la divisant en plusieurs parties"
    ],
    reponseCorrecte: 1,
    explication: "Les amorces comme 'C'est une question très intéressante...' ou 'Je partage globalement cet avis, toutefois...' ont une fonction précise : maintenir le flux de parole pendant que le cerveau organise sa réponse. Ces 5 à 10 secondes de réflexion 'en direct' sont cruciales pour éviter les silences paralysants."
  },
  {
    question: "Qu'est-ce que le 'nettoyage mental' entre les épreuves du TCF ?",
    options: [
      "Une technique de mémorisation pour retenir les questions de l'épreuve précédente",
      "Un exercice de révision rapide des points difficiles rencontrés",
      "La capacité à oublier instantanément une épreuve ratée pour ne pas polluer les suivantes",
      "Une pause officielle prévue par le règlement du TCF entre chaque épreuve"
    ],
    reponseCorrecte: 2,
    explication: "Le 'nettoyage mental' est la capacité à traiter chaque épreuve comme un nouveau départ indépendant. La frustration d'une Compréhension Orale difficile ne doit jamais altérer la concentration en Expression Écrite. C'est une compétence psychologique aussi importante que les compétences linguistiques."
  }
];
