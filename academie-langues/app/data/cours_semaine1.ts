// 1. On définit les modèles (Interfaces)
export interface CoursModule {
  id: number;
  titre: string;
  duree: string;
  description: string;
  contenu: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  reponseCorrecte: number; 
  explication: string; 
}

// 2. Les Données des Cours (Intégralité de tes 3 modules)
export const coursSemaine1: CoursModule[] = [
  {
    id: 1,
    titre: "MODULE I : DÉCODAGE COMPLET DE L'EXAMEN",
    duree: "20 min",
    description: "Tout ce que vous devez savoir avant de commencer à vous entraîner.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">DÉCODAGE COMPLET DE L'EXAMEN</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Tout ce que vous devez savoir avant de commencer à vous entraîner.</p>

        <div class="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-sm">
          <p class="font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm"> Ce module couvre :</p>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3 font-medium">
            <li class="flex items-center gap-2"> Épreuve 1, Compréhension Orale</li>
            <li class="flex items-center gap-2"> Épreuve 2, Compréhension Écrite</li>
            <li class="flex items-center gap-2"> Épreuve 3, Expression Écrite</li>
            <li class="flex items-center gap-2"> Épreuve 4, Expression Orale</li>
            <li class="flex items-center gap-2 md:col-span-2"> Conseils pratiques pour le Jour J</li>
          </ul>
          <p class="mt-4 text-sm text-slate-500 italic">Formation en autonomie, Conçue pour être suivie à domicile, à votre rythme.</p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">📌 Introduction, Comprendre l'examen avant tout</h4>
        <p class="mb-4 leading-relaxed text-base md:text-lg">
          Bienvenue dans ce premier module de préparation au TCF Canada. Avant de commencer à vous entraîner, il est essentiel de bien comprendre le fonctionnement de l'examen. Connaître les règles du jeu vous permettra d'adopter les bonnes stratégies dès le début, d'éviter les pièges classiques et de maximiser votre score.
        </p>
        <p class="mb-6 leading-relaxed text-base md:text-lg">
          Ce module est conçu pour être travaillé seul(e), depuis chez vous, sans qu'un formateur soit présent. Chaque explication est donc détaillée et progressive. Prenez le temps de lire attentivement chaque section : ce que vous apprendrez ici est la fondation de toute votre préparation.
        </p>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-5 md:p-6 rounded-r-2xl mb-8">
          <p class="font-bold text-blue-900 mb-2"> Qu'est-ce que le TCF Canada ?</p>
          <p class="text-blue-800 text-sm md:text-base leading-relaxed">
            Le Test de Connaissance du Français (TCF) Canada est un examen officiel reconnu par Immigration, Réfugiés et Citoyenneté Canada (IRCC). Il évalue vos compétences en français selon le Cadre Européen Commun de Référence pour les Langues (CECR), de A1 (débutant) à C2 (maîtrise parfaite). Le score que vous obtenez est directement converti en points CLB (Canadian Language Benchmarks), qui influencent directement vos chances d'immigration.
          </p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900">📋 Structure Générale du TCF Canada</h4>
        <p class="mb-4">Le TCF Canada se compose de quatre épreuves obligatoires. Voici un résumé rapide de chacune :</p>
        <div class="overflow-x-auto mb-8 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white">
            <thead class="bg-slate-100 text-slate-600 text-sm uppercase tracking-widest">
              <tr><th class="p-4">#</th><th class="p-4">Épreuve</th><th class="p-4">Durée</th><th class="p-4">Format</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm md:text-base">
              <tr><td class="p-4 font-bold">1</td><td class="p-4 font-bold"> Compréhension Orale</td><td class="p-4">35 min</td><td class="p-4">39 questions QCM, Écoute unique</td></tr>
              <tr><td class="p-4 font-bold">2</td><td class="p-4 font-bold"> Compréhension Écrite</td><td class="p-4">60 min</td><td class="p-4">39 questions QCM, Navigation libre</td></tr>
              <tr><td class="p-4 font-bold">3</td><td class="p-4 font-bold"> Expression Écrite</td><td class="p-4">60 min</td><td class="p-4">3 tâches de rédaction</td></tr>
              <tr><td class="p-4 font-bold">4</td><td class="p-4 font-bold"> Expression Orale</td><td class="p-4">~12 min</td><td class="p-4">3 tâches, Examinateur en présentiel</td></tr>
            </tbody>
          </table>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 bg-orange-100 p-3 rounded-lg inline-block">🎧 ÉPREUVE 1 : COMPRÉHENSION ORALE</h4>
        <p class="font-bold text-slate-600 mb-6 uppercase tracking-widest text-sm">Décoder ce que vous entendez, en une seule écoute</p>
        
        <p class="font-bold text-slate-900 mb-2">📌 Présentation de l'épreuve</p>
        <p class="mb-4">L'épreuve de compréhension orale est souvent celle qui génère le plus de stress chez les candidats, et ce pour une raison bien précise : chaque enregistrement n'est joué qu'une seule fois. Contrairement à ce que certains imaginent, il ne s'agit pas de retranscrire mot à mot ce que vous entendez, mais de saisir le sens global, les intentions des locuteurs, et les nuances du discours.</p>
        
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800 mb-2"> Format</p>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li>39 questions à choix multiples (QCM) affichées sur écran</li>
              <li>Vous disposez d'un casque audio fourni sur place</li>
              <li>Les questions sont liées à des enregistrements variés</li>
            </ul>
          </div>
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800 mb-2">⏱ Timing</p>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li>35 minutes au total, le rythme est soutenu</li>
              <li>Les questions s'enchaînent rapidement sans pause notable</li>
              <li>Pas de retour en arrière possible sur un enregistrement</li>
            </ul>
          </div>
        </div>

        <p class="font-bold text-slate-900 mt-6 mb-2"> Ce que l'algorithme évalue vraiment</p>
        <p class="mb-4">Beaucoup de candidats pensent qu'il suffit de comprendre les mots pour réussir cette épreuve. C'est une erreur fréquente. L'algorithme du TCF Canada ne teste pas votre capacité à identifier des mots isolés, il teste votre capacité à interpréter le sens profond d'un message.</p>
        <div class="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6">
          <p class="font-bold text-blue-900 mb-2">L'algorithme cherche à vérifier que vous :</p>
          <ul class="space-y-2 text-blue-800 text-sm md:text-base">
            <li>→ Captez les nuances de ton : ironie, doute, enthousiasme, refus poli</li>
            <li>→ Comprenez les sous-entendus et ce qui n'est pas dit explicitement</li>
            <li>→ Distinguez les intentions des locuteurs au-delà des mots-clés</li>
            <li>→ Identifiez le contexte de la conversation (lieu, relation entre les personnes)</li>
          </ul>
          <p class="mt-4 text-sm italic">Par exemple : si une personne dit « C'est... intéressant » avec un ton hésitant, la bonne réponse ne sera pas « Elle est enthousiaste » mais « Elle est peu convaincue ». C'est ce type de nuance que l'examen cherche à mesurer.</p>
        </div>

        <p class="font-bold text-slate-900 mt-6 mb-2"> Barème de notation, Compréhension Orale</p>
        <p class="mb-4">Le barème est progressif : les dernières questions valent beaucoup plus de points que les premières. Cela signifie que vos efforts doivent être proportionnels à l'enjeu de chaque question.</p>
        
        <div class="overflow-x-auto mb-6 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm">
            <thead class="bg-slate-100">
              <tr><th class="p-3">Questions</th><th class="p-3">Niveau CECR</th><th class="p-3">Difficulté</th><th class="p-3">Points / q.</th><th class="p-3">Total max</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-3 font-bold">36 – 39</td><td class="p-3">C2</td><td class="p-3 text-red-600">Très difficile</td><td class="p-3">33 pts</td><td class="p-3 font-bold">132 pts</td></tr>
              <tr><td class="p-3 font-bold">30 – 35</td><td class="p-3">C1</td><td class="p-3 text-orange-600">Difficile</td><td class="p-3">26 pts</td><td class="p-3 font-bold">156 pts</td></tr>
              <tr><td class="p-3 font-bold">20 – 29</td><td class="p-3">B2</td><td class="p-3 text-yellow-600">Intermédiaire +</td><td class="p-3">21 pts</td><td class="p-3 font-bold">210 pts</td></tr>
              <tr><td class="p-3 font-bold">11 – 19</td><td class="p-3">B1</td><td class="p-3 text-blue-600">Intermédiaire</td><td class="p-3">15 pts</td><td class="p-3 font-bold">135 pts</td></tr>
              <tr><td class="p-3 font-bold">5 – 10</td><td class="p-3">A2</td><td class="p-3 text-emerald-600">Élémentaire</td><td class="p-3">9 pts</td><td class="p-3 font-bold">54 pts</td></tr>
              <tr><td class="p-3 font-bold">1 – 4</td><td class="p-3">A1</td><td class="p-3 text-emerald-400">Débutant</td><td class="p-3">3 pts</td><td class="p-3 font-bold">12 pts</td></tr>
            </tbody>
          </table>
        </div>

        <p class="font-bold text-slate-800 mb-2"> Stratégie optimale pour ce barème</p>
        <p class="mb-6">Ne relâchez surtout pas votre concentration après les premières questions faciles. Le vrai score se joue entre les questions 20 et 39. Voici comment répartir votre énergie :</p>
        <ul class="list-disc pl-6 mb-8 space-y-2">
          <li><strong>Questions 1–10 (A1/A2) :</strong> répondez vite, elles sont peu importantes (max 66 pts)</li>
          <li><strong>Questions 11–19 (B1) :</strong> concentrez-vous, c'est là que beaucoup progressent</li>
          <li><strong>Questions 20–39 (B2/C1/C2) :</strong> mobilisez toute votre attention, elles représentent plus de 75 % du score total</li>
        </ul>

        <h5 class="font-bold text-lg mb-4">⚡ Stratégies, Ce qui fait gagner ou perdre des points</h5>
        <div class="grid md:grid-cols-2 gap-4 mb-8">
          <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
            <p class="font-bold text-emerald-800 mb-3"> BOOSTER DE POINTS (+)</p>
            <ul class="text-emerald-700 text-sm space-y-3">
              <li>✔ Repérer le ton de la voix (fâché, hésitant, ironique, enthousiaste)</li>
              <li>✔ Lire les réponses AVANT que l'audio ne démarre (anticipation active)</li>
              <li>✔ Identifier les bruits de fond (gare, rue, bureau) pour situer le contexte</li>
              <li>✔ Prendre des notes courtes pendant l'écoute (mots-clés, chiffres, noms)</li>
              <li>✔ Se focaliser sur le début et la fin des enregistrements (lieu où l'info clé est souvent donnée)</li>
            </ul>
          </div>
          <div class="bg-red-50 p-5 rounded-2xl border border-red-200">
            <p class="font-bold text-red-800 mb-3"> TUEUR DE SCORE (−)</p>
            <ul class="text-red-700 text-sm space-y-3">
              <li>✘ Se jeter sur le premier mot entendu, c'est souvent un distracteur placé intentionnellement</li>
              <li>✘ Paniquer si vous ratez un mot, lâchez prise et passez à la suite immédiatement</li>
              <li>✘ Traduire mentalement dans votre langue maternelle, vous perdrez du temps et le contexte</li>
              <li>✘ Tenter de tout mémoriser mot à mot, concentrez-vous sur le sens, pas les détails</li>
              <li>✘ Rester passif pendant l'écoute, prenez des notes même courtes</li>
            </ul>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl mb-10">
          <p class="font-bold text-orange-400 mb-3 text-lg">🔑 Technique clé : L'Anticipation Active</p>
          <p class="mb-4">La technique la plus efficace pour cette épreuve est l'anticipation active. Voici comment l'appliquer :</p>
          <ul class="space-y-3 text-sm md:text-base">
            <li><span class="font-black text-white">1. Étape 1, Avant l'audio :</span> lisez rapidement la question et les 4 options de réponse. Identifiez les mots importants.</li>
            <li><span class="font-black text-white">2. Étape 2, Pendant l'audio :</span> gardez les options en tête. Dès qu'un élément correspond, cochez mentalement.</li>
            <li><span class="font-black text-white">3. Étape 3, Après l'audio :</span> choisissez la réponse qui reflète le sens global, pas forcément le mot exact entendu.</li>
            <li><span class="font-black text-white">4. Étape 4, Méfiez-vous des distracteurs :</span> les fausses réponses reprennent souvent des mots de l'audio, mais dans un sens différent.</li>
          </ul>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 bg-blue-100 p-3 rounded-lg inline-block">📖 ÉPREUVE 2 : COMPRÉHENSION ÉCRITE</h4>
        <p class="font-bold text-slate-600 mb-6 uppercase tracking-widest text-sm">Lire vite, lire bien, sans lire tout</p>
        
        <p class="font-bold text-slate-900 mb-2">📌 Présentation de l'épreuve</p>
        <p class="mb-4">La compréhension écrite est, de toutes les épreuves, celle où la gestion du temps est la plus décisive. Vous avez 60 minutes pour traiter 39 textes et questions. Cela représente en moyenne moins de 2 minutes par question, ce qui laisse très peu de place à une lecture exhaustive.</p>

        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800 mb-2"> Format</p>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li>39 textes à lire sur écran, du plus simple au plus complexe</li>
              <li>Les textes vont du SMS simple à l'article littéraire ou scientifique</li>
              <li>Vous pouvez naviguer librement entre les questions, aucun ordre imposé</li>
            </ul>
          </div>
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800 mb-2">⏱ Timing</p>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li>60 minutes pour 39 questions, soit environ 90 secondes par question</li>
              <li>La vitesse de lecture est aussi importante que la compréhension</li>
              <li>Vous pouvez revenir sur une question non répondue avant la fin</li>
            </ul>
          </div>
        </div>

        <p class="font-bold text-slate-900 mt-6 mb-2"> Ce que l'algorithme évalue vraiment</p>
        <p class="mb-4">Contrairement à une lecture scolaire, l'algorithme du TCF Canada ne récompense pas ceux qui lisent lentement et méticuleusement. Il teste votre capacité à extraire rapidement l'information pertinente, ce qu'on appelle le « scanning ». Savoir trouver une date, un nom, une opposition, ou comprendre le sens d'une expression dans son contexte est plus utile que tout lire mot à mot.</p>

        <p class="font-bold text-slate-900 mt-6 mb-2"> Barème de notation, Compréhension Écrite</p>
        <p class="mb-4">Le même barème progressif s'applique ici. Notez bien que les questions C2 (36-39) rapportent à elles seules 132 points, soit autant que les 10 premières questions réunies.</p>
        
        <p class="font-bold text-slate-800 mb-2"> Stratégie optimale pour ce barème</p>
        <p class="mb-6">Une stratégie courante et efficace consiste à commencer par les questions les plus difficiles (36–39), car c'est là que le gain potentiel est le plus élevé. Cependant, si un texte difficile vous bloque, passez à la question suivante et revenez-y à la fin. Ne perdez jamais de temps sur quelque chose que vous ne maîtrisez pas encore.</p>

        <h5 class="font-bold text-lg mb-4">⚡ Stratégies, Ce qui fait gagner ou perdre des points</h5>
        <div class="grid md:grid-cols-2 gap-4 mb-8">
          <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
            <p class="font-bold text-emerald-800 mb-3"> BOOSTER DE POINTS (+)</p>
            <ul class="text-emerald-700 text-sm space-y-3">
              <li>✔ Technique du Scanning : chercher les majuscules, dates, chiffres et connecteurs logiques (Mais, Donc, Or, Car)</li>
              <li>✔ Lire la question AVANT de lire le texte, vous saurez exactement quoi chercher</li>
              <li>✔ Repérer les synonymes : si le texte dit « il est excédé », la bonne réponse dira probablement « il est énervé »</li>
              <li>✔ Faire confiance au contexte pour les mots inconnus, devinez selon la logique de la phrase</li>
              <li>✔ Utiliser les 2–3 premières phrases et la conclusion pour comprendre l'essentiel d'un long texte</li>
            </ul>
          </div>
          <div class="bg-red-50 p-5 rounded-2xl border border-red-200">
            <p class="font-bold text-red-800 mb-3"> TUEUR DE SCORE (−)</p>
            <ul class="text-red-700 text-sm space-y-3">
              <li>✘ Lire le texte mot à mot comme un roman, vous manquerez de temps</li>
              <li>✘ Bloquer sur un mot inconnu, passez et utilisez le contexte</li>
              <li>✘ Confondre les adverbes : « toujours », « souvent », « parfois » changent complètement le sens</li>
              <li>✘ Choisir la réponse qui contient un mot du texte sans vérifier si elle correspond vraiment à la question</li>
              <li>✘ Sauter les textes courts (SMS, panneaux) en pensant qu'ils sont moins importants, ils peuvent être des questions B2 ou C1</li>
            </ul>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl mb-10">
          <p class="font-bold text-orange-400 mb-3 text-lg">🔑 Technique clé : Le Scan-Question-Confirm (SQC)</p>
          <p class="mb-4">Voici la méthode en 3 étapes recommandée pour chaque question de cette épreuve :</p>
          <ul class="space-y-3 text-sm md:text-base">
            <li><span class="font-black text-white">5. SCAN —</span> Lisez la question. Identifiez le mot-clé principal (nom, lieu, date, sentiment, action).</li>
            <li><span class="font-black text-white">6. QUESTION —</span> Parcourez le texte uniquement pour trouver ce mot-clé ou son équivalent. Ne lisez pas tout.</li>
            <li><span class="font-black text-white">7. CONFIRM —</span> Lisez les 2–3 phrases autour du mot trouvé pour confirmer le sens. Choisissez votre réponse.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 2,
    titre: "MODULE II : MAÎTRISER L'EXPRESSION ÉCRITE",
    duree: "30 min",
    description: "Stratégies, gestion du temps, respect des consignes et exercices corrigés.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">MAÎTRISER L'EXPRESSION ÉCRITE</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Stratégies, gestion du temps, respect des consignes et exercices corrigés.</p>

        <div class="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-sm">
          <p class="font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm"> Ce module couvre :</p>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3 font-medium">
            <li class="flex items-center gap-2"> Présentation complète de l'épreuve Expression Écrite</li>
            <li class="flex items-center gap-2"> Gestion du temps : répartition précise par tâche</li>
            <li class="flex items-center gap-2"> Respect des consignes : les règles qui font ou brisent le score</li>
            <li class="flex items-center gap-2"> Stratégies avancées pour chaque tâche</li>
            <li class="flex items-center gap-2 md:col-span-2"> 1 exercice complet avec correction détaillée par tâche (3 exercices au total)</li>
          </ul>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">📌 Introduction, Pourquoi l'Expression Écrite est décisive</h4>
        <p class="mb-4 leading-relaxed text-base md:text-lg">
          L'épreuve d'Expression Écrite est l'une des deux épreuves actives du TCF Canada, celles où vous produisez du contenu au lieu de simplement choisir une réponse. C'est aussi l'épreuve qui révèle le plus clairement votre niveau réel de maîtrise du français, car vous ne pouvez pas vous fier au hasard : vous devez écrire, organiser, argumenter et respecter des contraintes précises.
        </p>
        <p class="mb-6 leading-relaxed text-base md:text-lg">
          Ce module vous donnera une compréhension profonde de ce que les correcteurs attendent, comment gérer votre temps de façon optimale, et comment éviter les erreurs qui coûtent des points même à des candidats qui connaissent bien le français.
        </p>

        <div class="bg-slate-900 text-white p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-xl">
          <p class="font-black text-orange-400 mb-3 uppercase tracking-widest text-sm flex items-center gap-2">🔑 L'idée clé à retenir dès maintenant :</p>
          <p class="text-slate-200 text-base md:text-lg leading-relaxed italic">
            "Le correcteur ne note PAS votre histoire. Il ne juge PAS si votre opinion est intéressante. Il évalue exclusivement votre maîtrise de la langue : structure, vocabulaire, grammaire et respect des consignes. Une réponse simple mais parfaitement construite vaut plus qu'une réponse brillante mais désorganisée."
          </p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900">📋 Présentation Générale de l'Épreuve</h4>
        <div class="overflow-x-auto mb-6 rounded-xl border border-slate-200">
          <table class="w-full text-left bg-white text-sm md:text-base">
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-3 font-bold bg-slate-50 w-1/3">Durée totale</td><td class="p-3">60 minutes</td></tr>
              <tr><td class="p-3 font-bold bg-slate-50">Nombre de tâches</td><td class="p-3">3 tâches à compléter</td></tr>
              <tr><td class="p-3 font-bold bg-slate-50">Format</td><td class="p-3">Saisie au clavier sur écran d'ordinateur</td></tr>
              <tr><td class="p-3 font-bold bg-slate-50">Outil de comptage</td><td class="p-3">Un compteur de mots est affiché en temps réel</td></tr>
              <tr><td class="p-3 font-bold bg-slate-50">Correction</td><td class="p-3">Par un correcteur humain certifié (pas un algorithme)</td></tr>
            </tbody>
          </table>
        </div>

        <p class="font-bold text-slate-800 mb-4">Les 4 critères officiels d'évaluation :</p>
        <ol class="list-decimal pl-5 space-y-2 mb-8">
          <li><strong>Cohérence :</strong> Organisation logique des idées, transitions fluides entre les parties, respect de la structure demandée</li>
          <li><strong>Vocabulaire :</strong> Richesse lexicale, précision des termes, absence de répétitions, utilisation de synonymes</li>
          <li><strong>Grammaire :</strong> Correction grammaticale, variété des structures de phrase, conjugaison maîtrisée, accords</li>
          <li><strong>Respect de la consigne :</strong> Nombre de mots respecté, format demandé, réponse complète et pertinente au sujet posé</li>
        </ol>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900"> Gestion du Temps, Répartition Recommandée</h4>
        <p class="mb-4">60 minutes pour 3 tâches : cela peut sembler suffisant, mais beaucoup de candidats se retrouvent à court de temps sur la Tâche 3, la plus valorisée. Voici la répartition optimale recommandée :</p>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-blue-50 p-4 rounded-xl border border-blue-100"><p class="font-black text-blue-800 text-xl mb-1">12 min</p><p class="font-bold text-blue-900 mb-2">TÂCHE 1</p><p class="text-xs md:text-sm text-blue-800">Message court (60–120 mots), Lecture consigne (1 min) + Rédaction (8 min) + Relecture/mots (3 min)</p></div>
          <div class="bg-purple-50 p-4 rounded-xl border border-purple-100"><p class="font-black text-purple-800 text-xl mb-1">18 min</p><p class="font-bold text-purple-900 mb-2">TÂCHE 2</p><p class="text-xs md:text-sm text-purple-800">Article de blog / Narration (120–150 mots), Lecture/plan (2 min) + Rédaction (13 min) + Relecture (3 min)</p></div>
          <div class="bg-orange-50 p-4 rounded-xl border border-orange-100"><p class="font-black text-orange-800 text-xl mb-1">28 min</p><p class="font-bold text-orange-900 mb-2">TÂCHE 3</p><p class="text-xs md:text-sm text-orange-800">Texte argumentatif (120–180 mots), Lecture documents (4 min) + Plan (3 min) + Rédaction (17 min) + Relecture (4 min)</p></div>
          <div class="bg-slate-100 p-4 rounded-xl border border-slate-200"><p class="font-black text-slate-700 text-xl mb-1">2 min</p><p class="font-bold text-slate-800 mb-2">RÉSERVE</p><p class="text-xs md:text-sm text-slate-600">Marge de sécurité / vérification orthographique globale</p></div>
        </div>

        <div class="bg-red-50 p-5 rounded-2xl border-l-4 border-red-500 mb-10">
          <p class="font-bold text-red-900 mb-2">⚠️ ATTENTION : La Tâche 1 est un piège temporel</p>
          <p class="text-red-800 text-sm md:text-base">Ne passez JAMAIS plus de 12 minutes sur la Tâche 1. Si vous n'avez pas terminé, finissez rapidement et passez à la suite. Une Tâche 1 parfaite ne compensera pas une Tâche 3 bâclée.</p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">✍️ TÂCHE 1, MESSAGE COURT</h4>
        <p class="font-bold text-slate-600 mb-4">60 à 120 mots · 12 minutes · Niveau A2–B1</p>
        <p class="mb-4">La Tâche 1 est la plus accessible. Elle vous demande d'écrire un message court dans un contexte de la vie quotidienne. L'objectif est de communiquer une information précise à un destinataire identifié, en adoptant le registre de langue approprié.</p>
        
        <div class="bg-slate-100 p-5 rounded-2xl mb-8">
          <p class="font-bold text-slate-900 mb-2">Les 5 règles absolues de la Tâche 1 :</p>
          <ol class="list-decimal pl-5 space-y-1 text-sm md:text-base">
            <li><strong>Nombre de mots :</strong> entre 60 et 120 mots. Visez 80–100 mots. En dessous de 60 = pénalité automatique.</li>
            <li><strong>Destinataire :</strong> adaptez le registre (tutoiement/ami vs vouvoiement/professionnel).</li>
            <li><strong>Objet du message :</strong> répondez précisément à la consigne.</li>
            <li><strong>Formule d'ouverture :</strong> commencez toujours par une salutation adaptée.</li>
            <li><strong>Formule de clôture :</strong> terminez toujours par une formule de politesse adaptée.</li>
          </ol>
        </div>

        <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-10">
          <p class="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">📝 EXERCICE, TÂCHE 1 (Correction Complète)</p>
          <p class="text-sm text-slate-600 mb-4"><strong>Sujet :</strong> Vous venez d'emménager dans un nouvel appartement. Vous écrivez un message à votre voisin(e) du dessus pour vous présenter et lui signaler poliment que la musique jouée le soir est un peu forte pour vous. Écrivez un message de 60 à 120 mots.</p>
          
          <div class="bg-red-50 p-4 rounded-xl mb-4 border-l-4 border-red-400">
            <p class="font-bold text-red-800 text-xs uppercase mb-2"> Réponse d'un candidat (à analyser) :</p>
            <p class="text-sm italic text-red-900 mb-2">"Salut voisin, Je m'appelle Sofia, je viens d'arriver dans l'appartement en dessous du tien. Je suis contente de rejoindre cet immeuble ! Je voulais te dire que parfois le soir, la musique est un peu forte pour moi. Ce n'est pas grave mais si tu pouvais baisser un peu après 22h, ce serait super. Merci beaucoup et à bientôt ! Sofia"</p>
            <p class="text-xs text-red-700 font-bold">⚠️ Analyse : Trop court (~75 mots), « Ce n'est pas grave » affaiblit le message, vocabulaire basique.</p>
          </div>
          <div class="bg-emerald-50 p-4 rounded-xl border-l-4 border-emerald-500">
            <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Réponse Modèle NEXA (Niveau B1/B2) :</p>
            <p class="text-sm text-emerald-900 font-medium mb-2">"Salut voisin(e),<br/>Je me présente : je m'appelle Sofia et je viens tout juste d'emménager dans l'appartement situé juste en dessous du tien. Je suis ravie de rejoindre cette résidence et j'espère que nous ferons bonne connaissance !<br/>Je me permets de te contacter pour aborder un petit sujet : le soir, la musique que tu écoutes est parfois un peu forte et m'empêche de me reposer correctement. Je ne voudrais surtout pas te déranger, mais si tu pouvais baisser le volume après 22h, ce serait vraiment sympa de ta part !<br/>Merci par avance pour ta compréhension, et à très bientôt !<br/>Sofia"</p>
            <p class="text-xs text-emerald-700 font-bold">Score estimé : 85–90%. Vocabulaire plus riche, ton parfaitement dosé, consignes toutes respectées.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">📖 TÂCHE 2, ARTICLE DE BLOG / NARRATION</h4>
        <p class="font-bold text-slate-600 mb-4">120 à 150 mots · 18 minutes · Niveau B1–B2</p>
        
        <div class="bg-amber-50 p-5 rounded-2xl border-l-4 border-amber-500 mb-6">
          <p class="font-bold text-amber-900 mb-2">⚠️ Idée reçue à corriger absolument</p>
          <p class="text-sm md:text-base text-amber-800">Beaucoup de candidats pensent que cette tâche sert à exprimer leur opinion et à argumenter. L'objectif principal de la Tâche 2 est de <strong>RACONTER</strong>, faire de la narration, tout en ajoutant une recommandation pour vos lecteurs. Ce n'est pas un texte argumentatif.</p>
        </div>

        <p class="mb-4">Les 5 règles absolues de la Tâche 2 :</p>
        <ol class="list-decimal pl-5 space-y-1 text-sm md:text-base mb-8">
          <li><strong>Nombre de mots :</strong> entre 120 et 150 mots. Visez 130–145 mots.</li>
          <li><strong>Format article :</strong> donnez un <strong>titre</strong> à votre article. C'est attendu et noté.</li>
          <li><strong>Narration au passé :</strong> utilisez le passé composé, l'imparfait et le plus-que-parfait.</li>
          <li><strong>Première personne :</strong> rédigez à la 1ère personne (je / nous).</li>
          <li><strong>Recommandation :</strong> terminez par un conseil ou une recommandation à vos lecteurs.</li>
        </ol>

        <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-10">
          <p class="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">📝 EXERCICE, TÂCHE 2 (Correction Complète)</p>
          <p class="text-sm text-slate-600 mb-4"><strong>Sujet :</strong> Vous avez récemment participé à un événement culturel (festival, exposition, concert) qui vous a particulièrement marqué(e). Rédigez un article de blog de 120 à 150 mots dans lequel vous racontez cette expérience et donnez une recommandation à vos lecteurs.</p>
          
          <div class="bg-red-50 p-4 rounded-xl mb-4 border-l-4 border-red-400">
            <p class="font-bold text-red-800 text-xs uppercase mb-2"> Réponse d'un candidat (à analyser) :</p>
            <p class="text-sm italic text-red-900 mb-2">"Mon premier festival de jazz<br/>L'année dernière, j'ai décidé d'aller à un festival de jazz dans ma ville. C'était bien. Il y avait beaucoup de gens et la musique était bonne. J'ai mangé des choses délicieuses et j'ai rencontré des personnes sympas. J'ai pensé que c'est une bonne expérience pour tout le monde. Je pense que les festivals sont importants pour la culture. C'est pour ça que je dis à mes lecteurs d'y aller. À bientôt !"</p>
            <p class="text-xs text-red-700 font-bold">⚠️ Analyse : Trop court (~90 mots), glisse vers l'argumentation ("Je pense que..."), vocabulaire très pauvre ("bien", "bonne").</p>
          </div>
          <div class="bg-emerald-50 p-4 rounded-xl border-l-4 border-emerald-500">
            <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Réponse Modèle NEXA (Niveau B2) :</p>
            <p class="text-sm text-emerald-900 font-medium mb-2">"Mon premier festival de jazz : une soirée inoubliable<br/>Ce n'est pas sans hésitation que j'avais accepté l'invitation de mon ami Karim à assister au festival de jazz de notre ville. Je n'étais pas particulièrement fan de ce style musical, du moins, je le croyais.<br/>Dès notre arrivée, une atmosphère chaleureuse nous a enveloppés. Les mélodies douces des cuivres s'entremêlaient aux conversations animées. J'ai rapidement été transportée par la performance du groupe principal : les musiciens jouaient avec une passion communicative, et je me suis surprise à danser spontanément.<br/>Cette soirée m'a ouvert les oreilles sur un univers musical que j'ignorais totalement. Si vous n'avez jamais assisté à un festival de jazz, je vous encourage vivement à franchir le pas, vous ne le regretterez pas !"</p>
            <p class="text-xs text-emerald-700 font-bold">Score estimé : 92–97%. Titre présent, passé composé + imparfait, détails sensoriels, recommandation finale.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">🏆 TÂCHE 3, TEXTE ARGUMENTATIF</h4>
        <p class="font-bold text-slate-600 mb-4">120 à 180 mots · 28 minutes · Niveau B2–C1</p>
        <p class="mb-4">C'est la tâche la plus complexe, la plus valorisée et celle qui départage réellement les candidats. Vous recevez deux documents présentant des points de vue opposés sur un sujet de société. Votre travail est d'abord de résumer ces deux perspectives de manière neutre, puis d'exprimer votre propre opinion avec des arguments.</p>
        
        <div class="bg-slate-100 p-5 rounded-2xl mb-8">
          <p class="font-bold text-slate-900 mb-2">Les 6 règles absolues de la Tâche 3 :</p>
          <ol class="list-decimal pl-5 space-y-1 text-sm md:text-base">
            <li><strong>Nombre de mots :</strong> entre 120 et 180 mots. Visez 150–170 mots.</li>
            <li><strong>Titre obligatoire :</strong> donnez un titre qui reflète le débat présenté. Sans titre = pénalité.</li>
            <li><strong>Structure en 2 parties :</strong> marquez clairement Partie 1 et Partie 2 (saut de ligne).</li>
            <li><strong>Partie 1 = NEUTRE :</strong> résumez les deux documents sans donner votre avis (40-60 mots).</li>
            <li><strong>Partie 2 = VOTRE OPINION :</strong> exprimez votre position, 2-3 arguments, conclusion (80-120 mots).</li>
            <li><strong>Lisez AVANT d'écrire :</strong> prenez 4 minutes pour bien comprendre les deux positions.</li>
          </ol>
        </div>

        <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 mb-8">
          <p class="font-bold text-emerald-900 mb-2"> Le signal C1 : le Subjonctif</p>
          <p class="text-sm md:text-base text-emerald-800">Placer un subjonctif correctement dans votre Tâche 3 est l'un des signaux les plus clairs d'un niveau C1. Exemples : <em>"Bien que ce soit un sujet complexe..."</em>, <em>"Il est indispensable que chacun prenne conscience de..."</em>, <em>"Pour que cette situation s'améliore, il faudrait que les autorités..."</em></p>
        </div>

        <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-10">
          <p class="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">📝 EXERCICE, TÂCHE 3 (Correction Complète)</p>
          <p class="text-sm text-slate-600 mb-4"><strong>Sujet :</strong> Lisez les deux documents ci-dessous, puis rédigez un texte de 120 à 180 mots. Dans la première partie, résumez de façon neutre les deux points de vue. Dans la seconde, exprimez votre opinion.<br/><strong>Doc A :</strong> Le télétravail offre flexibilité, moins de transport, meilleure qualité de vie et hausse de productivité.<br/><strong>Doc B :</strong> Le télétravail génère de l'isolement, efface la frontière pro/privé et nuit à la créativité collective.</p>
          
          <div class="bg-red-50 p-4 rounded-xl mb-4 border-l-4 border-red-400">
            <p class="font-bold text-red-800 text-xs uppercase mb-2"> Réponse d'un candidat (à analyser) :</p>
            <p class="text-sm italic text-red-900 mb-2">"Le télétravail : bon ou mauvais ?<br/>Le premier document dit que le télétravail est bon parce qu'il y a plus de flexibilité et moins de transport. Les gens travaillent mieux. Le deuxième document dit que le télétravail est mauvais parce que les gens sont seuls et il n'y a pas de créativité.<br/>Moi je pense que le télétravail est bien. C'est bien pour la famille. Les enfants sont contents. Tout le monde devrait faire du télétravail. C'est mieux pour l'environnement aussi."</p>
            <p class="text-xs text-red-700 font-bold">⚠️ Analyse : Trop court (~100 mots), vocabulaire très pauvre ("dit que c'est bon", "c'est bien"), aucun connecteur logique, argument hors sujet (environnement).</p>
          </div>
          <div class="bg-emerald-50 p-4 rounded-xl border-l-4 border-emerald-500">
            <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Réponse Modèle NEXA (Niveau C1) :</p>
            <p class="text-sm text-emerald-900 font-medium mb-2">"Le télétravail : liberté gagnée ou lien social perdu ?<br/>Le sujet du télétravail suscite des avis très partagés dans le monde professionnel.<br/>D'un côté, ses partisans soulignent les bénéfices concrets qu'il apporte : une flexibilité accrue, la suppression des trajets contraignants et une meilleure qualité de vie. Ils s'appuient notamment sur des études attestant une hausse de la productivité. En revanche, ses détracteurs insistent sur les effets néfastes d'un travail à distance prolongé : isolement des salariés, dissolution des équipes et recul de la créativité collective.<br/>Pour ma part, je suis convaincu(e) que le télétravail est un outil précieux à condition qu'il soit encadré. Il me semble indispensable qu'un équilibre soit trouvé entre jours à domicile et présence au bureau. Bien que ce modèle hybride exige une organisation rigoureuse, il permet de préserver à la fois l'autonomie du salarié et la dynamique d'équipe. C'est, à mon sens, la voie la plus raisonnable."</p>
            <p class="text-xs text-emerald-700 font-bold">Score estimé : 94–98%. 2 parties distinctes respectées, neutralité en P1, connecteurs variés, 2 structures au subjonctif en P2.</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 3,
    titre: "MODULE III : MAÎTRISER L'EXPRESSION ORALE",
    duree: "25 min",
    description: "Stratégies, gestion du temps, respect des consignes et exercices corrigés.",
    contenu: `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">MAÎTRISER L'EXPRESSION ORALE</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Stratégies, gestion du temps, respect des consignes et exercices corrigés.</p>

        <div class="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-sm">
          <p class="font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm"> Ce module couvre :</p>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3 font-medium">
            <li class="flex items-center gap-2"> Présentation complète de l'épreuve Expression Orale</li>
            <li class="flex items-center gap-2"> Gestion du temps : répartition précise par tâche</li>
            <li class="flex items-center gap-2"> Respect des consignes : ce que l'examinateur attend</li>
            <li class="flex items-center gap-2"> Stratégies avancées pour chaque tâche</li>
            <li class="flex items-center gap-2 md:col-span-2">📝 1 exercice avec transcription et analyse par tâche</li>
          </ul>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">📌 Introduction, Pourquoi l'Expression Orale est décisive</h4>
        <p class="mb-4 text-slate-700 leading-relaxed text-base md:text-lg">
          L'épreuve d'Expression Orale est la seule du TCF Canada qui se déroule en face à face avec un examinateur humain. C'est aussi celle qui génère le plus de stress chez les candidats, et souvent sans raison, car c'est précisément celle où une bonne préparation méthodique fait la plus grande différence.
        </p>
        <p class="mb-6 text-slate-700 leading-relaxed text-base md:text-lg">
          Contrairement aux épreuves de compréhension, il n'y a ici aucune chance : vous devez produire du français spontanément, maintenir un dialogue, gérer le temps et rester fluide même sous la pression. Ce module vous donne les outils concrets pour y arriver.
        </p>

        <div class="bg-slate-900 text-white p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-xl">
          <p class="font-black text-orange-400 mb-3 uppercase tracking-widest text-sm flex items-center gap-2">🔑 L'idée clé à retenir dès maintenant :</p>
          <p class="text-slate-200 text-base md:text-lg leading-relaxed italic">
            "L'examinateur ne cherche pas quelqu'un qui parle parfaitement. Il évalue votre capacité à communiquer : à maintenir un discours cohérent, à interagir naturellement et à vous adapter à la situation. Un candidat qui s'autocorrige et continue vaut mieux qu'un candidat qui se fige sur ses erreurs."
          </p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900"> Gestion du Temps, Répartition par Tâche</h4>
        <p class="mb-4">L'épreuve orale dure environ 12 minutes de production active. Voici les 3 tâches qui s'enchaîneront :</p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="bg-blue-50 p-5 rounded-xl border border-blue-100"><p class="font-black text-blue-800 text-xl mb-1">2 min</p><p class="font-bold text-blue-900 mb-2">TÂCHE 1</p><p class="text-sm text-blue-800">Présentation personnelle, Pas de préparation. L'examinateur vous invite à vous présenter.</p></div>
          <div class="bg-purple-50 p-5 rounded-xl border border-purple-100"><p class="font-black text-purple-800 text-xl mb-1">3 min 30</p><p class="font-bold text-purple-900 mb-2">TÂCHE 2 (+ 2 min prép)</p><p class="text-sm text-purple-800">Jeu de rôle, Dialogue interactif. Vous posez des questions, relancez, réagissez.</p></div>
          <div class="bg-orange-50 p-5 rounded-xl border border-orange-100"><p class="font-black text-orange-800 text-xl mb-1">4 min 30</p><p class="font-bold text-orange-900 mb-2">TÂCHE 3</p><p class="text-sm text-orange-800">Opinion (sujet d'actualité), Pas de préparation. L'examinateur pose une question ouverte.</p></div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">👤 TÂCHE 1, PRÉSENTATION PERSONNELLE</h4>
        <p class="mb-4">L'examinateur vous invite simplement à vous présenter. Cette tâche paraît facile, et c'est précisément son piège. Beaucoup de candidats la traitent comme une récitation mécanique, ce que l'examinateur remarque immédiatement et sanctionne en posant des questions de suivi inattendues.</p>
        
        <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8">
          <p class="font-bold text-slate-800 mb-3">Structure recommandée en 4 blocs :</p>
          <ul class="space-y-2 text-sm md:text-base">
            <li><strong>1. Identité & origine (25–30 sec) :</strong> « Je m'appelle... et je suis originaire de... »</li>
            <li><strong>2. Parcours académique/pro (35–40 sec) :</strong> « J'ai fait des études de... et j'ai ensuite travaillé comme... »</li>
            <li><strong>3. Situation actuelle (25–30 sec) :</strong> « Actuellement, je me consacre à... »</li>
            <li><strong>4. Projet (25–30 sec) :</strong> « Je passe le TCF Canada car mon projet est de... »</li>
          </ul>
        </div>

        <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-10">
          <p class="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">📝 EXERCICE, TÂCHE 1 (Correction Complète)</p>
          <div class="bg-red-50 p-4 rounded-xl mb-4 border-l-4 border-red-400">
            <p class="font-bold text-red-800 text-xs uppercase mb-2"> Transcription d'un candidat (à analyser) :</p>
            <p class="text-sm italic text-red-900 mb-2">« Bonjour. Je m'appelle Amadou. J'ai 32 ans. Je viens du Sénégal. J'ai fait des études de commerce. Ensuite j'ai travaillé dans une entreprise. Maintenant je suis en France. Je veux aller au Canada. C'est pour ça que je passe le TCF. Voilà. »</p>
            <p class="text-xs text-red-700 font-bold">⚠️ Analyse : Trop court (~30 sec). Phrases décousues. Vocabulaire très basique.</p>
          </div>
          <div class="bg-emerald-50 p-4 rounded-xl border-l-4 border-emerald-500">
            <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Réponse Modèle NEXA :</p>
            <p class="text-sm text-emerald-900 font-medium mb-2">« Bonjour. Je m'appelle Amadou, j'ai 32 ans et je suis originaire de Dakar, au Sénégal. J'ai effectué des études en commerce international à l'Université de Dakar, ce qui m'a permis d'acquérir de solides bases en gestion et en négociation. À l'issue de mes études, j'ai travaillé pendant quatre ans comme responsable commercial dans une société d'import-export... Actuellement, je me consacre à ma préparation au TCF Canada, car mon projet est de m'installer à Montréal pour poursuivre ma carrière dans un contexte francophone et multiculturel... »</p>
            <p class="text-xs text-emerald-700 font-bold">Score estimé : 88–93%. Durée de ~1m50. Structure en 4 blocs, connecteurs fluides.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">🤝 TÂCHE 2, JEU DE RÔLE / INTERACTION</h4>
        <p class="mb-4">Vous simulez une situation de la vie quotidienne. L'examinateur joue un rôle et vous devez obtenir des informations en posant des questions pertinentes. Vous avez 2 minutes de préparation avant le dialogue, puis 3 min 30 d'interaction.</p>
        
        <div class="bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-6">
          <p class="font-bold text-blue-900 mb-2"> La méthode de préparation en 3 étapes (pendant les 2 min) :</p>
          <ol class="list-decimal pl-5 space-y-1 text-sm md:text-base text-blue-800">
            <li><strong>Identifier le contexte :</strong> À qui je parle ? (Tutoiement ou vouvoiement ?).</li>
            <li><strong>Préparer 5–6 axes :</strong> Date, lieu, horaire, prix, conditions, équipement...</li>
            <li><strong>Anticiper les relances :</strong> Imaginez des questions de suivi (« Vous dites que... est-ce que... »).</li>
          </ol>
        </div>

        <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-10">
          <p class="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">📝 EXERCICE, TÂCHE 2 (Correction Complète)</p>
          <p class="text-sm text-slate-600 mb-4"><strong>Sujet :</strong> Un ami vous a parlé d'un cours de cuisine française. Vous appelez le centre pour obtenir toutes les informations. Registre : Formel.</p>
          <div class="bg-emerald-50 p-4 rounded-xl border-l-4 border-emerald-500">
            <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Réponse Modèle NEXA (Extraits de l'interaction) :</p>
            <p class="text-sm text-emerald-900 font-medium mb-2">
              <strong>Candidat :</strong> « Bonjour Madame/Monsieur, je me permets de vous appeler car j'ai entendu parler de vos cours de cuisine française et j'aimerais obtenir quelques informations. »<br/>
              <strong>Examinateur :</strong> « Bien sûr, je vous en prie. »<br/>
              <strong>Candidat :</strong> « Tout d'abord, pourriez-vous m'indiquer le tarif de ces cours et ce qu'il inclut exactement ? »<br/>
              <strong>Examinateur :</strong> « Le tarif est de 80 euros pour 4 séances, et les ingrédients sont fournis. »<br/>
              <strong>Candidat :</strong> « Je vois, c'est intéressant. Et à quels jours et horaires ces cours ont-ils lieu ? »<br/>
              (...)<br/>
              <strong>Candidat :</strong> « Très bien, c'est tout à fait ce que je cherchais. Je vais réfléchir et vous recontacter prochainement. Merci beaucoup pour ces précisions, bonne journée ! »
            </p>
            <p class="text-xs text-emerald-700 font-bold">L'astuce : Poser 1 question à la fois. Réagir aux réponses (« Je vois, c'est intéressant... »). Formules de politesse.</p>
          </div>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">🏆 TÂCHE 3, OPINION SUR SUJET D'ACTUALITÉ</h4>
        <p class="mb-4">L'examinateur choisit un sujet de société et vous pose une question ouverte. Vous devez développer une réponse structurée sans aucun temps de préparation, pendant environ 4 minutes 30. C'est la tâche la plus valorisée de l'épreuve orale (10 points sur 20).</p>
        
        <div class="bg-slate-900 text-white p-6 rounded-3xl mb-10 shadow-lg">
          <p class="font-black text-orange-400 text-xl mb-4">La structure PIED, 4 minutes 30 garantis</p>
          <ul class="space-y-4 text-sm md:text-base">
            <li><span class="font-bold text-orange-300">P - Problématique (30 sec) :</span> Reformulez la question à votre manière.</li>
            <li><span class="font-bold text-orange-300">I - Idées + / Pour (1 min 20) :</span> Présentez 2–3 arguments favorables avec exemples concrets.</li>
            <li><span class="font-bold text-orange-300">E - Envers / Contre (1 min 20) :</span> Présentez 2–3 arguments défavorables avec exemples.</li>
            <li><span class="font-bold text-orange-300">D - Décision (50 sec) :</span> Donnez votre position nuancée, concluez avec une phrase forte.</li>
          </ul>
        </div>
        
        <div class="bg-slate-100 p-5 rounded-2xl mb-8">
          <p class="font-bold text-slate-800 mb-3">Formules de niveau C1 à placer stratégiquement :</p>
          <ul class="space-y-2 text-sm md:text-base">
            <li><strong>Subjonctif :</strong> « Il est indispensable que chacun prenne conscience de... »</li>
            <li><strong>Tournures impersonnelles :</strong> « Il convient de souligner que... »</li>
            <li><strong>Connecteurs de haut niveau :</strong> « Qui plus est... » / « Force est de constater que... »</li>
            <li><strong>Nuance :</strong> « Certes, il est vrai que... mais il ne faut pas oublier que... »</li>
          </ul>
        </div>

        <div class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-10">
          <p class="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">📝 EXERCICE, TÂCHE 3 (Correction Complète)</p>
          <p class="text-sm text-slate-600 mb-4"><strong>Question :</strong> « Pensez-vous que le télétravail généralisé est une bonne chose pour la société ? »</p>
          <div class="bg-emerald-50 p-4 rounded-xl border-l-4 border-emerald-500">
            <p class="font-bold text-emerald-800 text-xs uppercase mb-2">✅ Réponse Modèle NEXA (Structure PIED) :</p>
            <p class="text-sm text-emerald-900 font-medium mb-2">
              « La question du télétravail généralisé est au cœur des débats depuis la crise sanitaire... Il m'a semblé important d'explorer cette question sous plusieurs angles.<br/>
              D'une part, les partisans du télétravail soulignent des avantages indéniables : la suppression des temps de trajet... offre aux salariés une qualité de vie significativement améliorée. On note également une hausse de la productivité...<br/>
              En revanche, il faut aussi reconnaître que le télétravail comporte des risques sérieux. L'isolement progressif des employés nuit à la cohésion d'équipe et peut freiner l'innovation collective...<br/>
              Pour ma part, je suis convaincu(e) qu'un modèle hybride représente la solution la plus équilibrée. Aussi séduisante que soit l'idée d'un télétravail total, il me semble indispensable que le lien humain soit préservé au sein des équipes. »
            </p>
            <p class="text-xs text-emerald-700 font-bold">Structure PIED respectée, Subjonctif ("il me semble indispensable que... soit"), connecteurs C1.</p>
          </div>
        </div>
      </div>
    `
  }
];

// 3. Le Mega-Quiz (30 Questions calibrées sur les documents NEXA)
export const quizSemaine1: QuizQuestion[] = [
  {
    question: "En Compréhension Orale, combien de fois chaque enregistrement est-il diffusé ?",
    options: ["1 fois", "2 fois", "3 fois", "Cela dépend de la difficulté"],
    reponseCorrecte: 0,
    explication: "C'est la règle stricte du TCF : chaque audio n'est joué qu'une seule et unique fois. D'où l'importance de l'anticipation !"
  },
  {
    question: "Quelle est la technique recommandée avant que l'audio ne démarre en Compréhension Orale ?",
    options: ["Fermer les yeux pour se concentrer", "Traduire la consigne mentalement", "L'Anticipation Active (lire les 4 options)", "Prendre une grande inspiration sans rien lire"],
    reponseCorrecte: 2,
    explication: "L'anticipation active (lire les options avant) permet de préparer son cerveau aux mots-clés qui vont être prononcés."
  },
  {
    question: "Que teste réellement l'algorithme en Compréhension Orale ?",
    options: ["Votre capacité à retranscrire mot à mot", "Votre capacité à saisir le sens profond et les nuances (ironie, doute)", "Votre niveau de vocabulaire technique", "Votre connaissance de l'accent québécois"],
    reponseCorrecte: 1,
    explication: "L'algorithme vérifie si vous captez les sous-entendus et le ton, bien au-delà des simples mots isolés."
  },
  {
    question: "En Compréhension Écrite, quel est le timing global de l'épreuve ?",
    options: ["30 minutes pour 20 textes", "60 minutes pour 39 questions", "45 minutes pour 39 questions", "90 minutes au total"],
    reponseCorrecte: 1,
    explication: "Vous disposez de 60 minutes pour 39 questions, soit environ 90 secondes par question. La gestion du temps est vitale."
  },
  {
    question: "Que signifie la méthode S.Q.C en Compréhension Écrite ?",
    options: ["Savoir, Questionner, Conclure", "Scan, Question, Confirm", "Survol, Quête, Choix", "Start, Quick, Correct"],
    reponseCorrecte: 1,
    explication: "Scan (lire la question), Question (chercher le mot-clé dans le texte), Confirm (lire autour du mot pour valider)."
  },
  {
    question: "Faut-il lire le texte en entier avant de lire la question en Compréhension Écrite ?",
    options: ["Oui, pour bien comprendre le contexte", "Non, il faut toujours lire la question en premier", "Seulement pour les textes courts", "Oui, c'est obligatoire"],
    reponseCorrecte: 1,
    explication: "Lire la question d'abord vous permet de savoir EXACTEMENT ce que vous cherchez, vous faisant gagner un temps précieux."
  },
  {
    question: "Combien de points rapportent les 4 dernières questions (36 à 39 - Niveau C2) en Compréhension Écrite ?",
    options: ["12 points", "54 points", "132 points", "Elles rapportent le même nombre de points que les autres"],
    reponseCorrecte: 2,
    explication: "Le barème est progressif. Les 4 dernières questions valent à elles seules 132 points ! Il faut mobiliser toute son attention sur la fin."
  },
  {
    question: "Quelle erreur vous fera perdre un temps précieux en Compréhension Écrite ?",
    options: ["Utiliser le Scanning", "Lire le texte mot à mot comme un roman", "Sauter une question difficile", "Chercher les majuscules"],
    reponseCorrecte: 1,
    explication: "Lire exhaustivement est un tueur de score. Vous devez extraire l'information pertinente, pas lire pour le plaisir."
  },
  {
    question: "Dans l'Expression Écrite, combien de temps est recommandé pour la Tâche 1 (Message court) ?",
    options: ["5 minutes", "12 minutes", "20 minutes", "30 minutes"],
    reponseCorrecte: 1,
    explication: "La Tâche 1 ne doit jamais dépasser 12 minutes (lecture, rédaction et relecture incluses)."
  },
  {
    question: "En Tâche 1 de l'Expression Écrite (consigne 60-120 mots), que se passe-t-il si j'écris 55 mots ?",
    options: ["C'est bon si le français est parfait", "Le correcteur ajoute des points de synthèse", "C'est une pénalité automatique", "L'examen est annulé"],
    reponseCorrecte: 2,
    explication: "Le respect du nombre de mots est une règle absolue. En dessous de 60 mots, c'est une pénalité sévère garantie."
  },
  {
    question: "Quelles formules sont obligatoires pour valider la Tâche 1 à l'écrit ?",
    options: ["Un titre et un sous-titre", "Une formule d'ouverture et une formule de clôture", "Une introduction et une conclusion de 3 lignes", "Un post-scriptum (P.S.)"],
    reponseCorrecte: 1,
    explication: "Commencer par 'Bonjour' ou 'Madame' et terminer par 'Cordialement' ou 'À bientôt' est un critère expressément noté."
  },
  {
    question: "Quel est l'objectif principal de la Tâche 2 de l'Expression Écrite (Article de blog) ?",
    options: ["Donner son opinion politique", "Raconter une expérience vécue (narration)", "Résumer un texte", "Écrire une lettre de motivation"],
    reponseCorrecte: 1,
    explication: "La Tâche 2 est narrative. Exprimer une opinion argumentée ici est hors-sujet et fait perdre beaucoup de points."
  },
  {
    question: "Quels temps grammaticaux devez-vous utiliser prioritairement dans la Tâche 2 écrite ?",
    options: ["Présent et Futur", "Conditionnel et Subjonctif", "Passé composé et Imparfait", "Impératif uniquement"],
    reponseCorrecte: 2,
    explication: "Puisque vous racontez une histoire passée, le Passé composé (pour les actions) et l'Imparfait (pour le décor et les émotions) sont indispensables."
  },
  {
    question: "Par quoi devez-vous impérativement terminer votre article de blog en Tâche 2 ?",
    options: ["Une recommandation à vos lecteurs", "Une signature officielle", "Une question rhétorique complexe", "Une citation célèbre"],
    reponseCorrecte: 0,
    explication: "Terminer par un conseil ('Je vous recommande vivement d'essayer') clôture parfaitement l'article de blog."
  },
  {
    question: "Combien de documents devez-vous lire pour la Tâche 3 de l'Expression Écrite ?",
    options: ["Aucun, c'est un sujet libre", "Un texte long", "Deux documents avec des avis opposés", "Trois petits articles"],
    reponseCorrecte: 2,
    explication: "La Tâche 3 repose toujours sur la comparaison de deux courts textes présentant le Pour et le Contre d'un sujet de société."
  },
  {
    question: "Que devez-vous obligatoirement écrire tout en haut de votre Tâche 3 ?",
    options: ["La date du jour", "Votre nom et prénom", "Le nombre de mots", "Un Titre qui reflète le débat"],
    reponseCorrecte: 3,
    explication: "Le titre est une consigne stricte de la Tâche 3. L'oublier entraîne une pénalité immédiate."
  },
  {
    question: "Comment doit être rédigée la Partie 1 (40-60 mots) de la Tâche 3 ?",
    options: ["Je donne mon avis très fort", "Je résume les deux textes de manière strictement NEUTRE", "Je recopie les phrases des textes", "J'invente une histoire"],
    reponseCorrecte: 1,
    explication: "La Partie 1 est un résumé objectif. Vous ne devez exprimer aucune opinion personnelle à ce stade."
  },
  {
    question: "Quel connecteur logique marque l'opposition au niveau C1 ?",
    options: ["Mais", "Parce que", "Néanmoins / En revanche", "Et aussi"],
    reponseCorrecte: 2,
    explication: "'Mais' est de niveau A2/B1. Pour viser le C1, utilisez 'Cependant', 'Néanmoins' ou 'En revanche'."
  },
  {
    question: "Quel mode verbal est le 'signal ultime' pour prouver votre niveau C1 au correcteur ?",
    options: ["Le Futur Proche", "Le Passé Simple", "Le Subjonctif", "L'Indicatif"],
    reponseCorrecte: 2,
    explication: "Placer un subjonctif (ex: 'Bien qu'il soit essentiel que...') prouve immédiatement votre maîtrise avancée de la langue."
  },
  {
    question: "Combien de temps dure l'épreuve d'Expression Orale en face à face avec l'examinateur ?",
    options: ["5 minutes", "12 minutes", "20 minutes", "30 minutes"],
    reponseCorrecte: 1,
    explication: "L'épreuve dure environ 12 minutes divisées en 3 tâches dynamiques."
  },
  {
    question: "Lors de la Tâche 1 de l'Oral (Présentation), devez-vous réciter un texte appris par cœur ?",
    options: ["Oui, pour éviter les fautes", "Non, l'examinateur le remarquera et vous interrompra", "Oui, mais très vite", "Cela n'a pas d'importance"],
    reponseCorrecte: 1,
    explication: "L'examinateur détecte les textes récités. Il vous coupera pour vérifier votre spontanéité. Soyez naturel !"
  },
  {
    question: "Combien de temps de préparation avez-vous pour la Tâche 2 de l'Oral (Interaction) ?",
    options: ["Aucune préparation", "2 minutes", "5 minutes", "10 minutes"],
    reponseCorrecte: 1,
    explication: "Vous avez 2 minutes pour lire la situation et noter vos questions sur un brouillon avant de commencer le dialogue."
  },
  {
    question: "Quelle est la plus grande erreur lors du dialogue de la Tâche 2 à l'Oral ?",
    options: ["Poser une seule question", "Poser 3 questions en même temps sans laisser l'examinateur répondre", "Vouvoyer l'examinateur", "Sourire"],
    reponseCorrecte: 1,
    explication: "C'est une interaction. Posez UNE question, écoutez la réponse, réagissez, puis posez la question suivante."
  },
  {
    question: "Dans la Tâche 2 orale, pourquoi est-il important de préparer des 'relances' ?",
    options: ["Pour énerver l'examinateur", "Parce qu'il faut tenir 3 minutes 30 et éviter les blancs", "Parce que c'est demandé dans la consigne", "Pour parler plus fort"],
    reponseCorrecte: 1,
    explication: "Si vous posez juste vos 4 questions basiques, l'échange durera 1 minute. Les relances ('Et dans ce cas, est-ce que...') permettent de tenir le temps imparti."
  },
  {
    question: "Combien de temps devez-vous développer votre réponse lors de la Tâche 3 de l'Oral ?",
    options: ["1 minute", "2 minutes", "4 minutes 30", "10 minutes"],
    reponseCorrecte: 2,
    explication: "C'est la tâche la plus longue et la plus valorisée (10 points). Vous devez structurer votre discours pour tenir 4 min 30."
  },
  {
    question: "Que signifie l'acronyme P.I.E.D pour structurer la Tâche 3 de l'Oral ?",
    options: ["Parler, Interroger, Écouter, Dire", "Problématique, Idées (+), Envers (-), Décision", "Phrase, Intonation, Exemple, Détail", "Pas Important En Direct"],
    reponseCorrecte: 1,
    explication: "Cette structure (Pour, Contre, Opinion) vous garantit de ne jamais manquer de choses à dire et de tenir les 4 minutes 30."
  },
  {
    question: "À l'oral, que devez-vous faire si l'examinateur vous pose une question de relance imprévue ?",
    options: ["L'ignorer et continuer", "Paniquer", "Accuser réception et développer la réponse en 3-4 phrases", "Répondre juste 'Oui' ou 'Non'"],
    reponseCorrecte: 2,
    explication: "Les relances sont des opportunités de briller. Dites 'C'est une bonne question...', et développez !"
  },
  {
    question: "Si vous faites une faute de grammaire pendant que vous parlez, que devez-vous faire ?",
    options: ["Vous arrêter de parler", "Pleurer", "Vous corriger naturellement ('Je suis allé, pardon, je suis allée')", "Faire comme si de rien n'était"],
    reponseCorrecte: 2,
    explication: "L'autocorrection est extrêmement valorisée au TCF ! Elle prouve que vous maîtrisez la règle, même si la langue a fourché."
  },
  {
    question: "Quel comportement physique est un 'tueur de score' à l'oral ?",
    options: ["Regarder l'examinateur dans les yeux", "Faire des phrases complètes", "Faire des blancs de plus de 5 secondes en disant 'Euh...'", "Sourire"],
    reponseCorrecte: 2,
    explication: "Les longs silences et les tics de langage répétitifs cassent la fluidité. Si vous cherchez vos mots, utilisez des phrases de transition ('Ce que je veux dire, c'est...')."
  },
  {
    question: "En Tâche 3 de l'Oral, devez-vous parler des aspects négatifs d'un sujet même si vous êtes 100% pour ?",
    options: ["Non, il faut défendre son opinion uniquement", "Oui, toujours ! Il faut présenter les deux aspects pour nuancer et tenir le temps", "Seulement si l'examinateur le demande", "Non, c'est hors-sujet"],
    reponseCorrecte: 1,
    explication: "L'examinateur note votre capacité à débattre. Aborder les avantages ET les inconvénients montre une réflexion de niveau supérieur (et vous fait gagner de précieuses minutes !)."
  }
];