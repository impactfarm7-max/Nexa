"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "isomorphic-dompurify";
import {
  ArrowLeft, GraduationCap, Sparkles, CheckCircle2, 
  ArrowRight, Lock, BookOpen, HelpCircle, AlertCircle, X, Trophy
} from "lucide-react";

// ==========================================
// 1. LES DONNÉES DU COURS (Intégralité du Module 1)
// ==========================================
const leconHTML = `
      <div class="prose max-w-none text-slate-700">
        <h3 class="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tight">DÉCODAGE COMPLET DE L'EXAMEN</h3>
        <p class="text-lg md:text-xl text-slate-600 mb-8 font-medium">Tout ce que vous devez savoir avant de commencer à vous entraîner.</p>

        <div class="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-10 shadow-sm">
          <p class="font-bold text-slate-800 mb-4 uppercase tracking-widest text-sm"> Ce module couvre :</p>
          <ul class="grid grid-cols-1 md:grid-cols-2 gap-3 font-medium">
            <li class="flex items-center gap-2"> Épreuve 1 — Compréhension Orale</li>
            <li class="flex items-center gap-2"> Épreuve 2 — Compréhension Écrite</li>
            <li class="flex items-center gap-2"> Épreuve 3 — Expression Écrite</li>
            <li class="flex items-center gap-2"> Épreuve 4 — Expression Orale</li>
            <li class="flex items-center gap-2 md:col-span-2"> Conseils pratiques pour le Jour J</li>
          </ul>
          <p class="mt-4 text-sm text-slate-500 italic">Formation en autonomie — Conçue pour être suivie à domicile, à votre rythme.</p>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 border-b border-slate-200 pb-2">📌 Introduction — Comprendre l'examen avant tout</h4>
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
              <tr><td class="p-4 font-bold">1</td><td class="p-4 font-bold"> Compréhension Orale</td><td class="p-4">35 min</td><td class="p-4">39 questions QCM — Écoute unique</td></tr>
              <tr><td class="p-4 font-bold">2</td><td class="p-4 font-bold"> Compréhension Écrite</td><td class="p-4">60 min</td><td class="p-4">39 questions QCM — Navigation libre</td></tr>
              <tr><td class="p-4 font-bold">3</td><td class="p-4 font-bold"> Expression Écrite</td><td class="p-4">60 min</td><td class="p-4">3 tâches de rédaction</td></tr>
              <tr><td class="p-4 font-bold">4</td><td class="p-4 font-bold"> Expression Orale</td><td class="p-4">~12 min</td><td class="p-4">3 tâches — Examinateur en présentiel</td></tr>
            </tbody>
          </table>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 bg-orange-100 p-3 rounded-lg inline-block">🎧 ÉPREUVE 1 : COMPRÉHENSION ORALE</h4>
        <p class="font-bold text-slate-600 mb-6 uppercase tracking-widest text-sm">Décoder ce que vous entendez — en une seule écoute</p>
        
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
              <li>35 minutes au total — le rythme est soutenu</li>
              <li>Les questions s'enchaînent rapidement sans pause notable</li>
              <li>Pas de retour en arrière possible sur un enregistrement</li>
            </ul>
          </div>
        </div>

        <p class="font-bold text-slate-900 mt-6 mb-2"> Ce que l'algorithme évalue vraiment</p>
        <p class="mb-4">Beaucoup de candidats pensent qu'il suffit de comprendre les mots pour réussir cette épreuve. C'est une erreur fréquente. L'algorithme du TCF Canada ne teste pas votre capacité à identifier des mots isolés — il teste votre capacité à interpréter le sens profond d'un message.</p>
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

        <p class="font-bold text-slate-900 mt-6 mb-2"> Barème de notation — Compréhension Orale</p>
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
          <li><strong>Questions 20–39 (B2/C1/C2) :</strong> mobilisez toute votre attention — elles représentent plus de 75 % du score total</li>
        </ul>

        <h5 class="font-bold text-lg mb-4">⚡ Stratégies — Ce qui fait gagner ou perdre des points</h5>
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
              <li>✘ Se jeter sur le premier mot entendu — c'est souvent un distracteur placé intentionnellement</li>
              <li>✘ Paniquer si vous ratez un mot — lâchez prise et passez à la suite immédiatement</li>
              <li>✘ Traduire mentalement dans votre langue maternelle — vous perdrez du temps et le contexte</li>
              <li>✘ Tenter de tout mémoriser mot à mot — concentrez-vous sur le sens, pas les détails</li>
              <li>✘ Rester passif pendant l'écoute — prenez des notes même courtes</li>
            </ul>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl mb-10">
          <p class="font-bold text-orange-400 mb-3 text-lg">🔑 Technique clé : L'Anticipation Active</p>
          <p class="mb-4">La technique la plus efficace pour cette épreuve est l'anticipation active. Voici comment l'appliquer :</p>
          <ul class="space-y-3 text-sm md:text-base">
            <li><span class="font-black text-white">1. Étape 1 — Avant l'audio :</span> lisez rapidement la question et les 4 options de réponse. Identifiez les mots importants.</li>
            <li><span class="font-black text-white">2. Étape 2 — Pendant l'audio :</span> gardez les options en tête. Dès qu'un élément correspond, cochez mentalement.</li>
            <li><span class="font-black text-white">3. Étape 3 — Après l'audio :</span> choisissez la réponse qui reflète le sens global — pas forcément le mot exact entendu.</li>
            <li><span class="font-black text-white">4. Étape 4 — Méfiez-vous des distracteurs :</span> les fausses réponses reprennent souvent des mots de l'audio, mais dans un sens différent.</li>
          </ul>
        </div>

        <h4 class="text-xl md:text-2xl font-bold mb-4 text-slate-900 bg-blue-100 p-3 rounded-lg inline-block">📖 ÉPREUVE 2 : COMPRÉHENSION ÉCRITE</h4>
        <p class="font-bold text-slate-600 mb-6 uppercase tracking-widest text-sm">Lire vite, lire bien — sans lire tout</p>
        
        <p class="font-bold text-slate-900 mb-2">📌 Présentation de l'épreuve</p>
        <p class="mb-4">La compréhension écrite est, de toutes les épreuves, celle où la gestion du temps est la plus décisive. Vous avez 60 minutes pour traiter 39 textes et questions. Cela représente en moyenne moins de 2 minutes par question — ce qui laisse très peu de place à une lecture exhaustive.</p>

        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800 mb-2"> Format</p>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li>39 textes à lire sur écran, du plus simple au plus complexe</li>
              <li>Les textes vont du SMS simple à l'article littéraire ou scientifique</li>
              <li>Vous pouvez naviguer librement entre les questions — aucun ordre imposé</li>
            </ul>
          </div>
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800 mb-2">⏱ Timing</p>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li>60 minutes pour 39 questions — soit environ 90 secondes par question</li>
              <li>La vitesse de lecture est aussi importante que la compréhension</li>
              <li>Vous pouvez revenir sur une question non répondue avant la fin</li>
            </ul>
          </div>
        </div>

        <p class="font-bold text-slate-900 mt-6 mb-2"> Ce que l'algorithme évalue vraiment</p>
        <p class="mb-4">Contrairement à une lecture scolaire, l'algorithme du TCF Canada ne récompense pas ceux qui lisent lentement et méticuleusement. Il teste votre capacité à extraire rapidement l'information pertinente — ce qu'on appelle le « scanning ». Savoir trouver une date, un nom, une opposition, ou comprendre le sens d'une expression dans son contexte est plus utile que tout lire mot à mot.</p>

        <p class="font-bold text-slate-900 mt-6 mb-2"> Barème de notation — Compréhension Écrite</p>
        <p class="mb-4">Le même barème progressif s'applique ici. Notez bien que les questions C2 (36-39) rapportent à elles seules 132 points — soit autant que les 10 premières questions réunies.</p>
        
        <p class="font-bold text-slate-800 mb-2"> Stratégie optimale pour ce barème</p>
        <p class="mb-6">Une stratégie courante et efficace consiste à commencer par les questions les plus difficiles (36–39), car c'est là que le gain potentiel est le plus élevé. Cependant, si un texte difficile vous bloque, passez à la question suivante et revenez-y à la fin. Ne perdez jamais de temps sur quelque chose que vous ne maîtrisez pas encore.</p>

        <h5 class="font-bold text-lg mb-4">⚡ Stratégies — Ce qui fait gagner ou perdre des points</h5>
        <div class="grid md:grid-cols-2 gap-4 mb-8">
          <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
            <p class="font-bold text-emerald-800 mb-3"> BOOSTER DE POINTS (+)</p>
            <ul class="text-emerald-700 text-sm space-y-3">
              <li>✔ Technique du Scanning : chercher les majuscules, dates, chiffres et connecteurs logiques (Mais, Donc, Or, Car)</li>
              <li>✔ Lire la question AVANT de lire le texte — vous saurez exactement quoi chercher</li>
              <li>✔ Repérer les synonymes : si le texte dit « il est excédé », la bonne réponse dira probablement « il est énervé »</li>
              <li>✔ Faire confiance au contexte pour les mots inconnus — devinez selon la logique de la phrase</li>
              <li>✔ Utiliser les 2–3 premières phrases et la conclusion pour comprendre l'essentiel d'un long texte</li>
            </ul>
          </div>
          <div class="bg-red-50 p-5 rounded-2xl border border-red-200">
            <p class="font-bold text-red-800 mb-3"> TUEUR DE SCORE (−)</p>
            <ul class="text-red-700 text-sm space-y-3">
              <li>✘ Lire le texte mot à mot comme un roman — vous manquerez de temps</li>
              <li>✘ Bloquer sur un mot inconnu — passez et utilisez le contexte</li>
              <li>✘ Confondre les adverbes : « toujours », « souvent », « parfois » changent complètement le sens</li>
              <li>✘ Choisir la réponse qui contient un mot du texte sans vérifier si elle correspond vraiment à la question</li>
              <li>✘ Sauter les textes courts (SMS, panneaux) en pensant qu'ils sont moins importants — ils peuvent être des questions B2 ou C1</li>
            </ul>
          </div>
        </div>

        <div class="bg-slate-900 text-white p-6 rounded-2xl mb-10">
          <p class="font-bold text-orange-400 mb-3 text-lg">🔑 Technique clé : Le Scan-Question-Confirm (SQC)</p>
          <p class="mb-4">Voici la méthode en 3 étapes recommandée pour chaque question de cette épreuve :</p>
          <ul class="space-y-3 text-sm md:text-base">
            <li><span class="font-black text-white">1. SCAN —</span> Lisez la question. Identifiez le mot-clé principal (nom, lieu, date, sentiment, action).</li>
            <li><span class="font-black text-white">2. QUESTION —</span> Parcourez le texte uniquement pour trouver ce mot-clé ou son équivalent. Ne lisez pas tout.</li>
            <li><span class="font-black text-white">3. CONFIRM —</span> Lisez les 2–3 phrases autour du mot trouvé pour confirmer le sens. Choisissez votre réponse.</li>
          </ul>
        </div>
      </div>
`;

// ==========================================
// 2. LE MEGA QUIZ (20 Questions - Basées sur le Module 1)
// ==========================================
const QUIZ_QUESTIONS = [
  { question: "Qu'évalue le TCF Canada selon le module ?", options: ["Vos compétences en anglais et français", "Vos compétences en français selon le CECR (de A1 à C2)", "La capacité à écrire des lettres formelles", "L'histoire canadienne"], reponseCorrecte: 1, explication: "Il évalue vos compétences selon le Cadre Européen (CECR)." },
  { question: "Combien d'épreuves obligatoires comporte le TCF Canada ?", options: ["2", "3", "4", "5"], reponseCorrecte: 2, explication: "4 épreuves : CO, CE, EE, EO." },
  { question: "En Compréhension Orale, combien de fois chaque audio est-il diffusé ?", options: ["1 fois", "2 fois", "3 fois", "À volonté"], reponseCorrecte: 0, explication: "Règle stricte : chaque enregistrement n'est joué qu'une seule fois." },
  { question: "Combien de temps dure l'épreuve de Compréhension Orale ?", options: ["30 min", "35 min", "45 min", "60 min"], reponseCorrecte: 1, explication: "Elle dure 35 minutes pour 39 questions." },
  { question: "Que teste réellement l'algorithme en Compréhension Orale ?", options: ["Écrire sans faute", "Saisir le sens profond, les nuances et le ton", "Mémoriser les noms", "La vitesse de clic"], reponseCorrecte: 1, explication: "Il vérifie si vous captez l'ironie, le doute, et les sous-entendus." },
  { question: "Quel pourcentage du score représentent les questions 20 à 39 en CO ?", options: ["10%", "50%", "Plus de 75%", "100%"], reponseCorrecte: 2, explication: "Le barème est progressif, ces questions valent plus de 75% du score." },
  { question: "Qu'est-ce que l'Anticipation Active en Compréhension Orale ?", options: ["Traduire", "Lire les options AVANT l'audio", "Fermer les yeux", "Cliquer au hasard"], reponseCorrecte: 1, explication: "Lire avant permet de préparer son cerveau." },
  { question: "À quoi servent les 'distracteurs' dans les fausses réponses ?", options: ["Tester l'anglais", "Reprendre des mots de l'audio dans un faux contexte", "Gagner du temps", "Aucune utilité"], reponseCorrecte: 1, explication: "Ils piègent ceux qui cochent un mot juste parce qu'ils l'ont entendu." },
  { question: "Combien de temps dure la Compréhension Écrite ?", options: ["35 min", "45 min", "60 min", "120 min"], reponseCorrecte: 2, explication: "60 minutes pour 39 questions." },
  { question: "En Compréhension Écrite, la navigation est-elle libre ?", options: ["Non", "Oui", "Seulement pour les textes courts", "Oui mais avec pénalité"], reponseCorrecte: 1, explication: "Vous pouvez sauter une question et y revenir plus tard." },
  { question: "Que récompense l'épreuve de Compréhension Écrite ?", options: ["La lecture mot à mot", "Le Scanning (extraire vite l'info)", "La traduction", "La grammaire"], reponseCorrecte: 1, explication: "L'épreuve teste votre vitesse et efficacité (Scanning)." },
  { question: "Combien de points rapportent les 4 dernières questions (C2) en CE ?", options: ["12 pts", "54 pts", "132 pts", "Le même nombre que les autres"], reponseCorrecte: 2, explication: "Elles valent 33 points chacune (Total 132)." },
  { question: "Pendant le Scanning, que faut-il chercher ?", options: ["Les adjectifs", "Les fautes", "Majuscules, dates et connecteurs logiques", "Les verbes"], reponseCorrecte: 2, explication: "Ils structurent le texte et cachent souvent la réponse." },
  { question: "Quel est un 'tueur de score' en Compréhension Écrite ?", options: ["Lire la question d'abord", "Sauter les textes courts", "Deviner le sens", "Chercher des synonymes"], reponseCorrecte: 1, explication: "Les textes courts (SMS) peuvent contenir des questions difficiles (B2/C1)." },
  { question: "Pourquoi se méfier des adverbes 'toujours', 'souvent', 'parfois' ?", options: ["C'est un bonus", "Ils changent radicalement le sens de la phrase", "Il faut les compter", "Ils sont inutiles"], reponseCorrecte: 1, explication: "Ils modifient le sens, c'est un piège classique." },
  { question: "Que signifie S.Q.C ?", options: ["Scan, Question, Confirm", "Savoir, Quitter, Conclure", "Start, Quick, Correct", "Survol, Quête, Choix"], reponseCorrecte: 0, explication: "C'est la méthode NEXA pour la Compréhension Écrite." },
  { question: "Que faire si l'on est bloqué sur un texte en CE ?", options: ["S'obstiner", "Demander de l'aide", "Passer et y revenir à la fin", "Arrêter"], reponseCorrecte: 2, explication: "La gestion du temps est primordiale, ne restez jamais bloqué." },
  { question: "Où trouve-t-on souvent 80% du sens d'un texte long ?", options: ["Au milieu", "Dans les citations", "Les premières phrases et la conclusion", "Dans le titre"], reponseCorrecte: 2, explication: "L'intro et la conclusion résument l'intention de l'auteur." },
  { question: "Si vous ratez un mot en Compréhension Orale, que faire ?", options: ["Paniquer", "Chercher à s'en souvenir", "Lâcher prise et passer à la suite", "Noter l'erreur"], reponseCorrecte: 2, explication: "Se focaliser sur un mot raté fait perdre le fil de tout le reste." },
  { question: "Est-ce utile de traduire mentalement l'audio dans sa langue maternelle ?", options: ["Oui, ça aide", "Non, c'est un tueur de score", "Seulement pour le niveau A1", "C'est obligatoire"], reponseCorrecte: 1, explication: "Cela fait perdre un temps précieux et le contexte global." }
];

// ==========================================
// 3. LE COMPOSANT REACT
// ==========================================
export default function DemoCoursPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lecon" | "quiz">("lecon");
  
  // États du Quiz
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // État de la modale d'inscription
  const [showSignupModal, setShowSignupModal] = useState(false);

  const handleValidate = () => {
    if (selectedOption === null) return;
    setIsValidated(true);
    if (selectedOption === QUIZ_QUESTIONS[currentQIndex].reponseCorrecte) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsValidated(false);
    } else {
      setQuizFinished(true);
      setTimeout(() => setShowSignupModal(true), 1500);
    }
  };

  const currentQ = QUIZ_QUESTIONS[currentQIndex];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-purple-500/30">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-100 transition"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                Cours & Quiz <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block">Démo Gratuite</span>
              </h1>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Module 1 : Méthodologie
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        
        {/* BANNIÈRE D'INFORMATION */}
        <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><Sparkles size={16} className="text-purple-500"/> Bienvenue dans le campus digital !</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Lisez cette leçon d'introduction gratuite, puis testez vos connaissances avec le Quiz interactif.</p>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="flex p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200 mb-6 max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab("lecon")}
            className={`flex-1 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === "lecon" ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-purple-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            <BookOpen size={14} /> La Leçon
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`flex-1 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === "quiz" ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-orange-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            <HelpCircle size={14} /> Le Quiz
          </button>
        </div>

        {/* CONTENU DE LA LEÇON */}
        {activeTab === "lecon" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] border border-slate-200 p-6 md:p-10 shadow-sm">
            <div className="border-b border-slate-100 pb-6 mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2 block">Semaine 1 • Introduction</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Décodage de l'Examen</h2>
            </div>
            
            {/* INJECTION DU HTML COMPLET DU MODULE 1 */}
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(leconHTML) }} className="prose max-w-none text-slate-700" />

            <div className="mt-10 pt-6 border-t border-slate-100 text-center">
              <button 
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setActiveTab("quiz");
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center gap-2 mx-auto"
              >
                Passer au Quiz <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* CONTENU DU QUIZ */}
        {activeTab === "quiz" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[2rem] border border-slate-200 p-6 md:p-10 shadow-sm relative overflow-hidden">
            
            {quizFinished ? (
              <div className="text-center py-10 relative z-10">
                <Trophy size={64} className="mx-auto text-orange-400 mb-6" />
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Quiz Terminé !</h2>
                <p className="text-lg font-medium text-slate-500 mb-6">Votre score : <span className="text-orange-600 font-black">{score} / {QUIZ_QUESTIONS.length}</span></p>
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-xs font-bold border border-emerald-100">
                  <CheckCircle2 size={16} /> Module 1 validé
                </div>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-4">
                  <span>Question {currentQIndex + 1} / {QUIZ_QUESTIONS.length}</span>
                  <span>Score : {score}</span>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-8 leading-tight">
                  {currentQ.question}
                </h2>

                <div className="space-y-3 mb-8">
                  {currentQ.options.map((option, index) => {
                    let btnClass = "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50 text-slate-700";
                    if (isValidated) {
                      if (index === currentQ.reponseCorrecte) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold";
                      else if (index === selectedOption) btnClass = "border-red-500 bg-red-50 text-red-700 font-bold";
                      else btnClass = "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                    } else if (selectedOption === index) {
                      btnClass = "border-orange-500 bg-orange-50 text-orange-700 font-bold ring-2 ring-orange-500/20";
                    }
                    return (
                      <button
                        key={index}
                        disabled={isValidated}
                        onClick={() => setSelectedOption(index)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${btnClass}`}
                      >
                        <span className="text-sm">{option}</span>
                        {isValidated && index === currentQ.reponseCorrecte && <CheckCircle2 size={18} className="text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {isValidated && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl mb-8 border ${selectedOption === currentQ.reponseCorrecte ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                      <p className="text-sm font-medium text-slate-700 flex items-start gap-2">
                        <AlertCircle size={16} className={`shrink-0 mt-0.5 ${selectedOption === currentQ.reponseCorrecte ? 'text-emerald-500' : 'text-slate-500'}`}/>
                        {currentQ.explication}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end">
                  {!isValidated ? (
                    <button 
                      onClick={handleValidate} disabled={selectedOption === null}
                      className="bg-slate-900 disabled:opacity-50 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center gap-2"
                    >
                      Valider <CheckCircle2 size={16} />
                    </button>
                  ) : (
                    <button 
                      onClick={handleNextQuestion}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex items-center gap-2"
                    >
                      {currentQIndex < QUIZ_QUESTIONS.length - 1 ? "Question Suivante" : "Terminer"} <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* 🛑 MODALE D'INSCRIPTION */}
      <AnimatePresence>
        {showSignupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowSignupModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden text-center p-8 z-10">
              <button onClick={() => setShowSignupModal(false)} className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
              
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-purple-100 shadow-inner">
                <GraduationCap className="w-8 h-8 text-purple-600" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Leçon Terminée !</h3>
              <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed px-2">Vous avez testé notre module de cours. Pour débloquer l'ensemble des 6 semaines de méthodologie, rejoignez l'Académie.</p>

              <button onClick={() => router.push("/login")} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 mb-3">
                Débloquer la formation <Lock size={14} />
              </button>
              
              <button onClick={() => router.push("/")} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Retour à l'accueil</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}