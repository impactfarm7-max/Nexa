import type { QuestionCE } from "./types";

export const questionsSerie4: QuestionCE[] = [
  // --- NIVEAU A1 ---
  {
    id: 1, niveau: "A1",
    texte: "Maman\nJe fais mes devoirs de mathématiques chez Louise. Je rentre à 21 heures.\nBises et à ce soir.\nPatrick",
    question: "Qu'est-ce que Patrick fait chez Louise ?",
    options: ["Il dort", "Il joue", "Il mange", "Il travaille"],
    reponseCorrecte: 3, explication: "Patrick écrit qu'il fait ses 'devoirs de mathématiques', ce qui correspond au fait de travailler."
  },
  {
    id: 2, niveau: "A1",
    texte: "France 5\n- 19 h 55 DOCUMENTAIRE → Bonjour la Bretagne\n- 20 H 35 MAGAZINES → La grande librairie. Présentation : François Bunel\n- 21 h 35 DOCUMENTAIRES → Arman, portrait d'un peintre et d'un sculpteur\n- 23 h 50 SÉRIE DOCUMENTAIRE → J'irai dormir chez vous « Maroc »",
    question: "À quelle heure est-ce qu'on peut voir une émission sur l'art ?",
    options: ["À 19 h 55", "À 20 h 55", "À 21 h 35", "À 23 h 55"],
    reponseCorrecte: 2, explication: "L'émission sur Arman, 'portrait d'un peintre et d'un sculpteur', est diffusée à 21 h 35. C'est la seule émission qui parle d'art."
  },
  {
    id: 3, niveau: "A1",
    texte: "Je suis arrivée chez moi.\nJe t'appelle demain pour aller voir le film. Je t'embrasse\nCyprien",
    question: "Où est Cyprien ?",
    options: ["À la gare", "À la maison", "Au cinéma", "Au travail"],
    reponseCorrecte: 1, explication: "Le message dit 'Je suis arrivée chez moi', ce qui signifie que Cyprien est rentré à la maison."
  },
  {
    id: 4, niveau: "A1",
    texte: "LA MAIRIE VOUS INFORME\nPendant les travaux, il est interdit de stationner devant l'entrée du supermarché.\nMerci d'utiliser le parking derrière la poste.",
    question: "Où pouvez-vous laisser votre voiture pendant les travaux ?",
    options: ["Devant la mairie", "Près de l'entrée du supermarché", "Derrière le bâtiment de la poste", "En face du parc"],
    reponseCorrecte: 2, explication: "L'affiche recommande d'utiliser 'le parking derrière la poste', soit derrière le bâtiment de la poste."
  },
  // --- NIVEAU A2 ---
  {
    id: 5, niveau: "A2",
    texte: "À bord du Tip Top, le plus grand bateau du bassin d'Arcachon, laissez-vous guider pour 2h30 de promenade au gré des vents et des courants marins.\nDépart de la jetée Thiers tous les jours en juillet et août, en fonction des horaires de la marée. Renseignez-vous la veille. Prix 25 euros par personne. 28 passagers maximums par croisière.",
    question: "Que propose ce document ?",
    options: ["La visite d'un bateau.", "Une promenade en mer.", "Une promenade en ville.", "La visite du port d'Arcachon."],
    reponseCorrecte: 1, explication: "Le document propose une promenade 'au gré des vents et des courants marins' à bord d'un bateau, ce qui correspond à une promenade en mer."
  },
  {
    id: 6, niveau: "A2",
    texte: "Le centre de Branféré a ouvert ses portes au printemps dernier dans un parc de Bretagne. Des classes du primaire y sont invitées. Les élèves y apprennent, pendant quelques jours, à connaître et respecter la nature.",
    question: "Qu'apprend-on sur le centre de Branféré ?",
    options: ["Il accueille les élèves et leurs parents", "Il est ouvert seulement au printemps", "Il est réservé aux écoles de Bretagne", "Il informe les enfants sur la nature"],
    reponseCorrecte: 3, explication: "Les élèves y apprennent 'à connaître et respecter la nature', ce qui correspond à l'option 'Il informe les enfants sur la nature'."
  },
  {
    id: 7, niveau: "A2",
    texte: "Cher Monsieur Damier,\nNous avons le plaisir de vous annoncer que vous êtes l'heureux gagnant de notre grand jeu de l'été. Vous pouvez dès maintenant venir chercher votre prix dans votre magasin préféré où nos soldes d'automne ont déjà commencé !\nBien cordialement",
    question: "Que va recevoir monsieur Damier ?",
    options: ["Un cadeau", "Une publicité", "Une visite", "Une lettre"],
    reponseCorrecte: 0, explication: "M. Damier est 'l'heureux gagnant' d'un jeu et peut 'venir chercher son prix', ce qui correspond à un cadeau."
  },
  {
    id: 8, niveau: "A2",
    texte: "GRAND JEU JARDIMARCHÉ\nVous pensez avoir le plus beau jardin ?\nEnvoyez une photo à grandjeu@jardimarche.com. Trois gagnants recevront un chèque de 500 euros valable dans tous nos magasins.",
    question: "Que propose Jardimarché ?",
    options: ["D'acheter des plantes à bon prix.", "De faire des courses en ligne.", "De participer à un concours.", "De recevoir des outils gratuits."],
    reponseCorrecte: 2, explication: "Le 'grand jeu' auquel participent les gens en envoyant une photo est un concours. La réponse C correspond à 'participer à un concours'."
  },
  {
    id: 9, niveau: "A2",
    texte: "Bonjour Ahmed,\nCe message pour te rappeler la réunion de lundi. Nous commanderons des paniers-repas pour le midi car la séance peut durer longtemps, les dossiers à traiter sont nombreux, veux-tu en informer les personnes des services concernées ? Merci d'avance.\nÀ lundi.\nPierre",
    question: "Que demande Pierre à Ahmed ?",
    options: ["D'apporter le déjeuner", "D'avancer le rendez-vous", "De consulter les documents", "De prévenir les collègues."],
    reponseCorrecte: 3, explication: "Pierre demande à Ahmed 'd'en informer les personnes des services concernées', c'est-à-dire de prévenir les collègues."
  },
  {
    id: 10, niveau: "A2",
    texte: "Chers parents,\nJe profite d'une étape en ville pour vous envoyer un courriel. La randonnée se passe bien, nous marchons beaucoup avec les moniteurs. C'est fatigant, mais la région est magnifique.\nBisous, à bientôt.\nKarim",
    question: "Pourquoi est-ce que Karim écrit à ses parents ?",
    options: ["Pour annoncer son retour", "Pour parler de son travail", "Pour prendre des nouvelles", "Pour raconter ses vacances"],
    reponseCorrecte: 3, explication: "Karim parle de sa randonnée, de la région et des moniteurs. Il raconte ses vacances à ses parents."
  },
  // --- NIVEAU B1 ---
  {
    id: 11, niveau: "B1",
    texte: "Vous avez entre 16 et 25 ans et vous souhaitez travailler rapidement ?\nVenez rencontrer des chefs d'entreprise et connaître les formations existantes au salon de l'entreprise, du 3 au 9 avril prochain.",
    question: "Qu'est-ce qu'on peut faire dans ce salon ?",
    options: ["Participer à un stage de plusieurs jours.", "S'informer sur le monde professionnel.", "S'inscrire à un cours réservé aux jeunes.", "Trouver de l'aide pour écrire un CV."],
    reponseCorrecte: 1, explication: "Au salon, on peut 'rencontrer des chefs d'entreprise et connaître les formations existantes', ce qui correspond à s'informer sur le monde professionnel."
  },
  {
    id: 12, niveau: "B1",
    texte: "Un récent sondage a révélé que le tourisme intercontinental des Européens commence à s'essouffler. Désormais, on connaît bien nos voisins, on veut donc voir autre chose. Les touristes n'ont pas l'impression de changer d'air s'ils ne quittent pas l'Union. On assiste à un développement du tourisme de longue distance, par exemple vers L'Afrique du Sud.",
    question: "Selon les dernières études, les Européens...",
    options: ["Voyagent plutôt dans l'Union Européenne", "Visitent de préférence leurs pays d'origine", "Découvrent les pays de leurs voisins", "S'aventurent dans les pays lointains"],
    reponseCorrecte: 3, explication: "Le texte mentionne 'un développement du tourisme de longue distance, par exemple vers L'Afrique du Sud', ce qui correspond à s'aventurer dans les pays lointains."
  },
  {
    id: 13, niveau: "B1",
    texte: "Ne dites plus dépendance, dites autonomie\nLes mots changent, le problème demeure. Ce problème est celui d'une population qui vit de plus en plus longtemps, grâce aux progrès de la médecine, mais dont les dernières années nécessitent très souvent une assistance à domicile ou un hébergement en maison de retraite médicalisée.",
    question: "Selon ce texte, quelle difficulté rencontrent les personnes âgées ?",
    options: ["Elles ont besoin d'accompagnement.", "Elles ont peur de quitter leur logement.", "Elles souffrent de grande solitude", "Elles suivent des traitements coûteux"],
    reponseCorrecte: 0, explication: "Le texte dit que leurs dernières années 'nécessitent très souvent une assistance à domicile ou un hébergement', ce qui signifie qu'elles ont besoin d'accompagnement."
  },
  {
    id: 14, niveau: "B1",
    texte: "Les vacanciers français ont trouvé cet été le bonheur chez eux, avec une nette préférence pour les côtes ensoleillées, tandis que les étrangers européens ou non, qui n'avaient pas choisi la France l'an dernier, sont revenus. Globalement, la fréquentation touristique a légèrement progressé, selon des données statistiques recueillies. La montagne a connu une belle saison aussi des taux de réservation dans les résidences de tourisme en hausse de 9% en Savoie et Haute-Savoie, dans les Alpes.",
    question: "Où les Français ont-ils préféré passer leurs vacances d'été ?",
    options: ["À l'étranger", "Dans les Alpes", "En Europe", "En France"],
    reponseCorrecte: 3, explication: "Le texte précise que les vacanciers français ont trouvé 'le bonheur chez eux', c'est-à-dire en France."
  },
  {
    id: 15, niveau: "B1",
    texte: "COMMENT APPRENDRE UNE LANGUE ÉTRANGÈRE\nExiste-t-il un âge critique au-delà duquel on ne peut plus jamais atteindre le niveau d'un locuteur natif ? Ce sujet fait l'objet de nombreux débats, plus on est jeune, plus on a d'appétit pour découvrir le monde. L'apprentissage d'une langue, quelle qu'elle soit, est donc plus simple. Mais il y a également une composante sociale. On se comporte avec l'enfant d'une manière bien particulière, que l'on ne peut reproduire avec un adolescent ou un adulte.",
    question: "D'après cet extrait, qu'est-ce qui favorise chez les enfants l'apprentissage d'une langue étrangère ?",
    options: ["Leur curiosité", "Leur imagination", "Leur mémoire", "Leur obéissance"],
    reponseCorrecte: 0, explication: "Le texte dit 'plus on est jeune, plus on a d'appétit pour découvrir le monde', ce qui correspond à la curiosité naturelle des enfants."
  },
  {
    id: 16, niveau: "B1",
    texte: "Une collégienne de 13 ans a remporté un prix grâce à son idée d'entreprise. Soucieuse de l'environnement, la jeune fille a imaginé un service qui encourage la récupération de bouteilles en plastique. Son concept est simple : le consommateur échange des bouteilles en plastique vides contre un objet recyclé. Par exemple, avec une bouteille en plastique, il peut commander un stylo, avec 47 bouteilles il peut avoir un t-shirt et pour 65 bouteilles il a la possibilité d'acheter une couverture.",
    question: "Que propose la jeune fille pour les bouteilles en plastique vides ?",
    options: ["De les produire de façon écologique", "De les revendre à un prix réduit", "De les transformer en vêtement", "De les utiliser comme monnaie"],
    reponseCorrecte: 3, explication: "Les bouteilles vides s'échangent contre des objets recyclés, elles sont donc utilisées comme une forme de monnaie d'échange."
  },
  {
    id: 17, niveau: "B1",
    texte: "Job d'été, la première expérience\nQuand une entreprise fait appel pour la première fois à un jeune, elle n'a pas d'attente vis-à-vis de ses compétences professionnelles, c'est donc sur son comportement que vont se porter ses critères d'évaluation. Même saisonnier, il faut montrer qu'on a vraiment envie de décrocher un job. Les jeunes sans expérience ont tout intérêt à parler de leur passion et à démontrer leur motivation. Pour un employeur, c'est ce qui reste souvent le critère le plus important.",
    question: "Selon l'article, que faut-il faire pour trouver un job d'été ?",
    options: ["Exposer l'ensemble de ses qualités professionnelles", "Faire la preuve de son désir de travailler", "Parler avec enthousiasme de ses projets de formation", "Parler des emplois qu'on a déjà occupés"],
    reponseCorrecte: 1, explication: "L'article dit que 'montrer qu'on a vraiment envie' et démontrer sa motivation est 'souvent le critère le plus important', ce qui correspond à faire la preuve de son désir de travailler."
  },
  {
    id: 18, niveau: "B1",
    texte: "MATCH SÈTE - TOURS\nMercredi 12 novembre\n- Achat des billets au prix de vente habituels : 15 €\n- Réduction pour les étudiants et les détenteurs de carte « Famille nombreuse »\n- Vendu aux guichets du stade, le soir même : 20 €",
    question: "À quelle condition l'acheteur a-t-il un meilleur prix ?",
    options: ["En achetant les billets à l'avance.", "En choisissant des places pour quatre matchs", "En prenant des billets pour un groupe", "En présentant une carte de club de sport"],
    reponseCorrecte: 0, explication: "Les billets achetés à l'avance coûtent 15 €, tandis que ceux vendus 'le soir même' au guichet sont à 20 €. Acheter à l'avance donne donc un meilleur prix."
  },
  {
    id: 19, niveau: "B1",
    texte: "LA NEO-RURAUTÉ EST DEVENUE UN PHÉNOMÈNE DE SOCIÉTÉ.\nCette dénomination date des années 70 c'est le retour à la terre alors que la désertification des campagnes se poursuit, un mouvement de population inverse s'opère. Il concerne des personnes jeunes, sans enfant, portant les valeurs contestataires de mai 68. Issues de toutes les classes sociales, elles ne recherchent pas spécialement le confort. Elles veulent avant tout vivre une expérience, ce qui les différencie de la population locale et ne facilite pas leur intégration.",
    question: "Que veulent les néo-ruraux ?",
    options: ["Accéder à la propriété privée", "Avoir un mode de vie économique", "Participer à la vie associative", "Tenter une nouvelle aventure"],
    reponseCorrecte: 3, explication: "Le texte précise qu'ils veulent avant tout 'vivre une expérience', ce qui correspond à tenter une nouvelle aventure."
  },
  // --- NIVEAU B2 ---
  {
    id: 20, niveau: "B2",
    texte: "Elle a 27 ans et a trouvé sa vocation : restauratrice de meubles. Stéphanie reçoit, à ce titre, le prix du jeune artisan d'art : « La dotation va me permettre d'ouvrir mon atelier. J'ai déjà trouvé le lieu, dans un village entre Narbonne et Carcassonne. » Son compagnon y a créé une menuiserie. Stéphanie a déjà touché à tout, au fil de sa formation, dont un BTS en alternance, obtenu dans son Auvergne natale. Nos vœux de réussite !",
    question: "Quel projet cette personne veut-elle réaliser ?",
    options: ["Démarrer une activité professionnelle", "Présenter son travail à un concours", "S'associer à un groupement d'artisans", "Suivre une formation complémentaire"],
    reponseCorrecte: 0, explication: "Stéphanie veut 'ouvrir mon atelier' grâce à la dotation reçue, ce qui correspond à démarrer une activité professionnelle."
  },
  {
    id: 21, niveau: "B2",
    texte: "Mathieu Lagouanère et Élodie Calas, deux journalistes, ont fait un tour du monde avec une idée originale : provoquer des rencontres en faisant goûter le roquefort, un fromage traditionnel, fabriqué dans leur région. « Le roquefort était simplement un moyen de faire connaissance avec les habitants. Ses principales caractéristiques, les taches de moisissure et l'odeur, peuvent faire réagir », explique Mathieu. La société Roquefort leur a fourni les fromages. Ils ont raconté leurs aventures dans un blog de voyage.",
    question: "Quel était l'objectif de Mathieu et Élodie ?",
    options: ["Découvrir des recettes locales", "Entrer en contact avec les gens", "Réaliser une opération publicitaire", "Vendre des spécialités françaises"],
    reponseCorrecte: 1, explication: "Mathieu précise que 'le roquefort était simplement un moyen de faire connaissance avec les habitants', ce qui correspond à entrer en contact avec les gens."
  },
  {
    id: 22, niveau: "B2",
    texte: "Avant de pouvoir entrer, il faut jurer par écrit que l'on s'engage à participer à la lutte contre le réchauffement de la planète.\nBar Surya est devenue la première boîte de nuit écologique. Située à Londres, elle ne propose que des boissons biologiques et offre une entrée gratuite aux clients qui peuvent prouver qu'ils sont venus à pied, à vélo, en bus ou en métro. De plus, un système d'énergie recyclable utilise les mouvements des pieds des danseurs pour fournir une partie de l'électricité. L'objectif affiché est de sensibiliser les jeunes au développement durable. Une bonne idée marketing qui devrait inspirer d'autres initiatives du même type...",
    question: "Quelle est l'originalité de la discothèque dont il est question ?",
    options: ["Elle s'adresse exclusivement à une clientèle soucieuse des questions d'environnement.", "Elle travaille à la réduction des accidents de la route due à l'alcool.", "Le coût du billet d'entrée varie en fonction de l'énergie produite par les danseurs", "Les jeunes doivent consommer sur place les produits du commerce équitable."],
    reponseCorrecte: 0, explication: "Le bar exige un engagement écologique à l'entrée et tout est conçu autour de l'environnement, s'adressant donc à une clientèle soucieuse des questions d'environnement."
  },
  {
    id: 23, niveau: "B2",
    texte: "La ville chinoise de Chongqing vient d'inaugurer des voies réservées aux « accros » du portable sur les trottoirs. Les piétons sont en effet nombreux à ne prêter aucune attention à leur entourage, au risque de provoquer des accidents. Un parcours délimité par des lignes blanches peintes au sol invite ceux qui ne quittent pas des yeux leur écran à les emprunter. L'idée de ce marquage n'est pas d'encourager l'usage des portables, mais d'inciter chacun à réfléchir à la place qu'il leur donne dans son quotidien et à faire attention aux autres.",
    question: "Quel est l'objectif de cette initiative concernant les portables ?",
    options: ["Faciliter leur utilisation dans l'ensemble de la commune", "Faire prendre conscience des excès liés à leur usage", "Instaurer de nouvelles règles de priorité de circulation", "Multiplier les espaces publicitaires le long des avenues"],
    reponseCorrecte: 1, explication: "L'objectif est 'd'inciter chacun à réfléchir à la place qu'il leur donne dans son quotidien', ce qui correspond à faire prendre conscience des excès liés à leur usage."
  },
  {
    id: 24, niveau: "B2",
    texte: "Fixer des limites strictes à la pêche, c'est l'action que va mener l'Australie afin de protéger la vie aquatique. « Il est temps que la planète franchisse une nouvelle étape dans la protection des océans » a déclaré le ministre australien de l'environnement. La création d'un réseau de parcs marins aura un impact sur le secteur de la pêche commerciale qui recevra 79,2 millions d'euros en contrepartie. La fondation australienne pour la protection de l'environnement a qualifié cette annonce « d'historique », mais elle souligne que plusieurs zones restaient menacées par l'exploitation humaine des ressources naturelles.",
    question: "Que projette le gouvernement australien ?",
    options: ["D'aménager des réserves restreignant la pêche", "D'encourager une politique mondiale de la pêche", "D'organiser des contrôles pour surveiller la pêche", "De créer des taxes sur les produits de la pêche"],
    reponseCorrecte: 0, explication: "La création d'un réseau de parcs marins vise à 'fixer des limites strictes à la pêche', ce qui correspond à aménager des réserves restreignant la pêche."
  },
  {
    id: 25, niveau: "B2",
    texte: "L'éducation nationale française vient d'inscrire aux programmes scolaires une initiation à la programmation informatique, appelée « Code ». Le but n'est pas de faire de tous les enfants des informaticiens, mais il est clair que se limiter à être uniquement un utilisateur passif constituera par la suite un handicap professionnel. Le chantier est immense car il faut introduire cette nouvelle matière sans compter sur suffisamment de professeurs formés pour cela. En effet, la vitesse à laquelle les technologies numériques ont changé a été bien supérieure à celle de l'évolution de la formation des équipes pédagogiques.",
    question: "Qu'apprend-on au sujet de l'enseignement du code à l'école ?",
    options: ["Les enfants ont des difficultés de concentration dans ce domaine", "Les équipements informatiques des écoles sont devenus obsolètes", "Les établissements doivent se doter d'une connexion illimitée", "Les professeurs avec les compétences nécessaires sont rares"],
    reponseCorrecte: 3, explication: "Le texte précise qu'il faut introduire cette matière 'sans compter sur suffisamment de professeurs formés', ce qui signifie que les professeurs compétents sont rares."
  },
  {
    id: 26, niveau: "B2",
    texte: "Futur manager, soyez gentil !\nDepuis les scandales des traders, les grandes écoles ont été mises au plan des accusés : Ce qu'elles transmettaient se limitait à du savoir technique directement exploitable par les entreprises. Myopie sociale et absence d'esprit critique menaçaient les futurs managers du monde économique. L'éthique est maintenant à la mode dans toutes les grandes écoles de management. Il n'y est question que de « social business » ou de « développement durable ». À côté des activités associatives traditionnelles, les actions humanitaires ont fleuri et de plus en plus d'étudiants s'y investissent chaque année. Désormais, un étudiant doit avoir fait du soutien scolaire en banlieue ou monté du microcrédit en Afrique.",
    question: "D'après ce texte, quelle est la nouvelle orientation des grandes écoles ?",
    options: ["Créer des partenariats avec le milieu associatif.", "Former des jeunes défavorisés au management", "Intégrer des valeurs sociales et environnementales", "Préparer des techniciens aux dangers de la finance"],
    reponseCorrecte: 2, explication: "Les grandes écoles intègrent maintenant le 'social business', le 'développement durable' et les actions humanitaires, ce qui correspond à intégrer des valeurs sociales et environnementales."
  },
  {
    id: 27, niveau: "B2",
    texte: "D'abord surpris par la naïveté du film, puis sceptique face aux clichés habituels et gentillesses de ce genre de longs métrages potaches. On se laisse progressivement porter par la réalisation décalée du cinéaste et par l'interprétation savoureuse de la distribution. S'il manque parfois de rythme et s'il a un peu vieilli, ce film n'en demeure pas moins réussi dans sa capacité à savoir capter l'esprit bohème et bon enfant des échanges Erasmus !! Après, ça n'est bien sûr pas le chef-d'œuvre de l'année, mais il est tellement rare aujourd'hui de voir un film français proposer quelque chose d'assez original et drôle sans départir d'une certaine simplicité et d'une réelle justesse. Qu'on ne peut que saluer le travail du réalisateur et de sa sympathique équipe.",
    question: "Quelle critique négative ce spectateur émet-il sur ce film ?",
    options: ["La réalisation de l'œuvre manque de maîtrise", "Le film tombe dans les stéréotypes du genre", "Le jeu des comédiens lui semble plutôt médiocre", "Le scénario du film est maladroitement construit"],
    reponseCorrecte: 1, explication: "Le spectateur parle de 'clichés habituels' de ce genre de films, ce qui correspond à 'le film tombe dans les stéréotypes du genre'."
  },
  {
    id: 28, niveau: "B2",
    texte: "L'institution scolaire devra sans cesse être défendue, ne serait-ce que parce que la « société civile » n'aura de cesse de vouloir assujettir l'école à ses demandes particulières. Il faut sans cesse rappeler, par exemple, que les règles de l'école ne sont pas celles de la maison. Car l'enfant n'y est plus seulement un enfant, il y est un élève. À l'école, on ne se préoccupe plus de confort et de l'affection pour l'enfant. On s'adresse à l'intelligence de l'élève. Le rapport maître/élève n'est d'ailleurs pas un rapport affectif : on ne demande pas à un professeur d'être sympathique. On lui demande d'être exigeant et juste.",
    question: "Quelle est l'opinion de l'auteur ?",
    options: ["L'ambiance de l'école doit être calquée sur le modèle familial", "L'autorité du professeur doit être compensée par sa gentillesse", "L'épanouissement de l'enfant doit primer sur sa réussite", "L'impartialité doit être l'une des qualités principales d'un maître"],
    reponseCorrecte: 3, explication: "L'auteur insiste sur le fait que le professeur doit être 'exigeant et juste', ce qui correspond à l'impartialité comme qualité principale."
  },
  {
    id: 29, niveau: "B2",
    texte: "« Pendant des millénaires, les chercheurs du monde entier ont jalousement gardé leurs données. Essentiellement parce qu'ils pensaient que le contrôle de l'information donnait le pouvoir » déclare le conservateur en paléontologie au musée d'Histoire naturelle de Londres. Les mentalités ont changé depuis quelques années à partir du moment où les savants ont pris conscience des bénéfices du travail collaboratif et du partage de l'information. Cependant vouloir échanger entre chercheurs et parvenir à le faire correctement sont deux choses très différentes, c'est ce que constatent les invités d'une conférence internationale sur la biodiversité qui se tient dans la capitale britannique.",
    question: "Quelle est la principale difficulté que rencontrent les chercheurs de cette conférence ?",
    options: ["Mettre en commun les données", "Multiplier les colloques internationaux", "Protéger les résultats de leurs études", "Vulgariser l'information scientifique"],
    reponseCorrecte: 0, explication: "Le texte précise que 'vouloir échanger entre chercheurs et parvenir à le faire correctement sont deux choses très différentes', ce qui signifie que mettre en commun les données est la principale difficulté."
  },
  // --- NIVEAU C1 ---
  {
    id: 30, niveau: "C1",
    texte: "Trouver un logement dans une ville étudiante est un parcours du combattant pour un grand nombre d'inscrits dans l'enseignement supérieur. La barrière est parfois infranchissable : non seulement les loyers sont élevés, mais la sélection des candidats par les propriétaires est très dure, souvent basée sur le niveau de revenus des garants. Pour lever ce frein, la caution locative étudiante (CLE) vient d'être généralisée à l'ensemble du territoire national après avoir été expérimentée dans quatre régions pendant un an. Avec ces dispositifs, c'est l'État qui se porte garant du versement des loyers des étudiants en cas de non paiement.",
    question: "Quel est le principal obstacle à l'accès au logement des étudiants selon cette analyse ?",
    options: ["La méfiance des propriétaires", "La rareté des offres de logement.", "L'absence d'engagement de l'État", "Le montant de la caution exigée"],
    reponseCorrecte: 0, explication: "Le texte souligne que 'la sélection des candidats par les propriétaires est très dure', ce qui reflète la méfiance des propriétaires comme principal obstacle."
  },
  {
    id: 31, niveau: "C1",
    texte: "L'opération « Voile à l'école » permet chaque année à des centaines d'enfants d'apprendre à faire du bateau pendant l'école. Au départ, la voile fait peur. Pour rassurer les élèves débutants les leçons sont très progressives. Les enseignants reçoivent des cahiers avec des explications et des informations techniques. Ils peuvent ainsi développer en classe un programme de prévention pour identifier et éviter les dangers.",
    question: "Quel est le but de l'opération « Voile à l'école » ?",
    options: ["Expérimenter une nouvelle technologie par le sport", "Former les maîtres à la pratique du sport sur l'eau", "Permettre aux jeunes de découvrir un sport difficile", "Réduire les risques en éducation physique et sportive"],
    reponseCorrecte: 2, explication: "L'opération permet à des enfants 'd'apprendre à faire du bateau', ce qui correspond à permettre aux jeunes de découvrir ce sport."
  },
  {
    id: 32, niveau: "C1",
    texte: "Christian Hacker, dessinateur né en 1967 à Strasbourg, est devenu « Butch » très tôt, et pas seulement parce que dans la cour de récréation il était le portrait craché du caporal du même nom, l'un des héros de la célèbre bande dessinée « Les Tuniques Bleues ». C'est aussi grâce au dessin que « le petit Christian » se protégeait. « Je me coupais du monde, ça m'arrangeait bien, car je fuyais le sport, j'avais la terreur de devenir un souffre-douleur. Le dessin m'a donné une stature au sein de la classe et m'a aidé à survivre... » Doué, il puise dans ses lectures d'enfant de quoi développer son don ; « c'était tellement emballant les BD que je lisais que j'essayais de perpétuer le plaisir en reproduisant les ambiances de Tartine, Picsou ou Lucky Luke ».",
    question: "Comment s'explique l'engouement de Christian Hacker pour le dessin ?",
    options: ["Il dessinait sans relâche", "Il se réfugiait dans le dessin pour échapper à ses camarades", "Il vendait ses dessins pour se faire de l'argent de poche", "Il voulait ressembler à un personnage de bande dessinée"],
    reponseCorrecte: 1, explication: "Christian dit 'Je me coupais du monde' et il avait 'la terreur de devenir un souffre-douleur', ce qui montre qu'il se réfugiait dans le dessin pour échapper à ses camarades."
  },
  {
    id: 33, niveau: "C1",
    texte: "C'est un joli coup de peinture... avant fermeture !\nLe vieil hôpital psychiatrique du Mans, construit en 1828 et classé aux Monuments historiques depuis 2004, a vu l'arrivée de drôles de troupes. Promis à la destruction et à la rénovation, le bâtiment a été investi par des artistes. L'occasion était belle pour le collectif associatif « Espace provisoire » d'envahir les salles et de leur redonner une seconde vie. Plus de 1000 m² ont été occupés par une soixantaine d'artistes : musiciens, sculpteurs, photographes... tous prêts à accueillir des visiteurs, des curieux.\nL'objectif, non avoué, est de prouver que la culture est à sa place Partout.",
    question: "Que cherche à faire le collectif « Espace provisoire » ?",
    options: ["Convertir les lieux en maison de culture", "Diffuser l'art dans les endroits inattendus", "Ouvrir un centre de formation artistique", "Rénover les anciens locaux en les décorant"],
    reponseCorrecte: 1, explication: "Le collectif veut 'prouver que la culture est à sa place Partout', notamment dans un hôpital psychiatrique, ce qui correspond à diffuser l'art dans des endroits inattendus."
  },
  {
    id: 34, niveau: "C1",
    texte: "« Le Fait du Roi »\nC'est l'histoire d'un homme qui prend l'identité d'un autre, mort, en se glissant dans sa peau, dans sa vie, dans sa maison... Rien ne sert de raconter l'intrigue de ce roman tant elle est simple et sans surprise. L'écriture de l'auteur reste cependant toujours aussi piquante et agréable à lire. Le héros principal, quant à lui, est dépeint avec une certaine profondeur.",
    question: "Sur quel point porte la critique négative faite à ce livre ?",
    options: ["La description du personnage", "La longueur du texte", "La qualité de l'écriture", "Le déroulement des événements"],
    reponseCorrecte: 3, explication: "La critique négative porte sur l'intrigue qui est 'simple et sans surprise', ce qui correspond au déroulement des événements."
  },
  {
    id: 35, niveau: "C1",
    texte: "L'ambition de cet auteur\nChanger l'art d'écrire, rien de moins. Mais cela est dit sans emphase, d'un ton dubitatif, fataliste presque « Changer l'art d'écrire, chaque écrivain le fait à sa façon. Je voudrais le faire de façon absolue, radicale, en abolissant totalement les histoires, l'intrigue, bien qu'il y ait toujours, en fait, des sortes de micro-narrations dans mes livres. J'ai l'idée qu'il est encore trop tôt pour savoir ce que j'ai apporté ou pas. Cela dit, lorsque vous écrivez, vous êtes tellement occupé à essayer de résoudre les problèmes techniques qui se posent à chaque instant que vous n'avez pas le temps d'avoir beaucoup d'idées générales. »",
    question: "De quelle manière cet auteur veut-il réaliser son ambition ?",
    options: ["En abandonnant les codes traditionnels du roman.", "En cherchant des sources d'inspiration inédites.", "En proposant de nouveaux concepts universels.", "En se jouant des difficultés liées à l'écriture."],
    reponseCorrecte: 0, explication: "L'auteur veut 'abolir totalement les histoires, l'intrigue', ce qui correspond à abandonner les codes traditionnels du roman."
  },
  // --- NIVEAU C2 ---
  {
    id: 36, niveau: "C2",
    texte: "Suite à un accident chimique sur un site minier, les pouvoirs publics ont décidé d'obliger les sociétés minières à financer des programmes de recherche et à replanter les surfaces exploitées. Et de fait, les compagnies minières jouent très bien le jeu. Comme il serait bien naïf de penser que leurs dirigeants soient tout à coup devenus philanthropes, il faut chercher la raison de cet intérêt ailleurs. Il se trouve qu'un scientifique, Anthony Van der Hent, a prouvé que des « super-plantes » avaient la faculté d'extraire du sol des métaux économiquement exploitables. C'est donc la possibilité d'allier la régénération de sites industriels à des assurances de gains financiers supplémentaires qui motivent tant les industriels.",
    question: "Sur quel point porte le scepticisme du journaliste ?",
    options: ["La capacité des plantes à nettoyer les sols.", "La rentabilité d'un nouveau système d'extraction.", "Le résultat des recherches de M. Van der Hent", "Les préoccupations écologistes des industriels."],
    reponseCorrecte: 3, explication: "Le journaliste juge 'naïf de penser que leurs dirigeants soient devenus philanthropes' : leur engagement écologique est motivé par le gain financier, pas par l'écologie. Le scepticisme porte donc sur les prétendues préoccupations écologistes des industriels."
  },
  {
    id: 37, niveau: "C2",
    texte: "Une scolarisation précoce permet une meilleure adaptation à l'univers scolaire et peut donc être le gage d'une réussite scolaire ultérieure. « La scolarisation avant 3 ans, écrit Agnès Florin (professeur de psychologie), trouve des justifications dans les résultats de plusieurs recherches, au moins pour les enfants des milieux défavorisés et sur certains aspects de leur développement cognitif et langagier. Par ailleurs, l'entrée précoce à l'école permet d'éviter l'apparition de troubles ou de perturbations et joue donc un rôle préventif. On trouve en effet de nombreux exemples de jeunes enfants dont on a pu détecter certains problèmes psychologiques ou physiologiques grâce à leur entrée à l'école.",
    question: "Selon l'auteur, que permet la scolarité précoce des enfants ?",
    options: ["Développer leurs capacités de socialisation", "Diagnostiquer d'éventuels déséquilibres", "Faciliter l'apprentissage d'une seconde langue", "Lutter contre les inégalités sociales"],
    reponseCorrecte: 1, explication: "Le texte mentionne qu'on peut 'détecter certains problèmes psychologiques ou physiologiques' grâce à la scolarisation précoce, ce qui correspond à diagnostiquer d'éventuels déséquilibres."
  },
  {
    id: 38, niveau: "C2",
    texte: "PRIX BAS TOUTE L'ANNÉE\nDes voyages aux loisirs en passant par les voitures, plus question de rater la bonne affaire. Voilà pourquoi les fins de série, les promotions, les soldes ne se sont jamais aussi bien portés. On achète surtout des vêtements, jusqu'à 14 articles pour un montant moyen de 186 euros, même si on doit dépenser moins le reste de l'année. Le gouvernement l'a bien compris : il vient d'octroyer deux semaines supplémentaires de soldes, à la convenance des commerçants, en dehors des mois de juillet et janvier, afin de redonner un peu de tonus aux ventes.",
    question: "Quel est le thème de cet article ?",
    options: ["La baisse des achats en boutique", "Le développement du commerce en ligne", "Les stratégies des consommateurs", "Un nouveau concept de magasin"],
    reponseCorrecte: 2, explication: "L'article parle des habitudes d'achat des consommateurs (promotions, soldes, vêtements), ce qui correspond aux stratégies des consommateurs."
  },
  {
    id: 39, niveau: "C2",
    texte: "Le trois-mâts d'exploration la Boudeuse va reprendre le large pour une nouvelle mission à caractère scientifique. Le voilier va mettre le cap sur plusieurs pays d'Amérique du Sud tels que le Suriname et la Guyane française. Il s'agit d'observer les écosystèmes dans les régions traversées par de grands fleuves, en collaboration avec de grands instituts d'études scientifiques et humanistes. Des spécialistes de la biosphère accompagneront l'équipage pour cette mission unique.",
    question: "Selon l'article, que va faire l'équipage du voilier La Boudeuse ?",
    options: ["Former des scientifiques à la prévention des risques écologiques", "Innover dans les moyens de lutter contre les pollutions fluviales", "Observer l'écosystème dans une région de grands fleuves", "Représenter le gouvernement français lors d'une rencontre"],
    reponseCorrecte: 2, explication: "La mission est d'observer les écosystèmes dans les régions traversées par de grands fleuves en Amérique du Sud, ce qui correspond à l'option C."
  },
];
