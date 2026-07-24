import type { QuestionCE } from "./types";


export const questionsSerie8: QuestionCE[] = [

  // --- NIVEAU A1 ---
{
    id: 1, niveau: "A1",
    texte: "Taméo,\nLe train de ta collègue Allemande arrive à 15 heures.\nTu peux aller la chercher ?\nSMS 12:14",
    question: "Où doit aller Taméo ?",
    options: ["La gare", "Au travail", "Chez une amie", "En Allemagne"],
    reponseCorrecte: 0,
    explication: "Le message demande à Taméo d'aller chercher une collègue dont le train arrive à 15h, donc il doit se rendre à la gare."
  },
  {
    id: 2, niveau: "A1",
    texte: "Vous êtes petit, blond, gros ?\nVous avez les cheveux longs ?\nVous voulez faire du cinéma ?\nContactez-nous au 05 45 87 86 68",
    question: "Qu'est-ce que cette annonce propose ?",
    options: ["De changer de coiffure", "De devenir mannequin", "De jouer un film", "D'essayer un régime"],
    reponseCorrecte: 2,
    explication: "L'annonce cherche des personnes ayant un physique particulier pour faire du cinéma, soit jouer dans un film."
  },
  {
    id: 3, niveau: "A1",
    texte: "Visite d'un musée des beaux-arts vendredi prochain.\nMerci de donner deux tickets de métro à votre enfant.\nLe professeur.",
    question: "Qu'est-ce que les parents payent pour cette activité ?",
    options: ["L'entrée", "Le guide", "Le repas", "Le transport"],
    reponseCorrecte: 3,
    explication: "Le professeur demande deux tickets de métro, ce qui correspond au transport pour se rendre au musée."
  },
  {
    id: 4, niveau: "A1",
    texte: "Vend Renault grise 50 000 km.\nClimatiseur automatique airbag.\n4 vitres électriques, autoradio.\nBon état général, 2100 euros.\nContactez Pierre au 06 97 73 61 27.",
    question: "Que cherche Pierre ?",
    options: ["Un acheteur", "Un conseil", "Un garage", "Une voiture"],
    reponseCorrecte: 0,
    explication: "Pierre met sa voiture en vente et donne son numéro de contact, il cherche donc un acheteur."
  },
  {
    id: 5, niveau: "A2",
    texte: "Sophie,\nRendez-vous vers midi en face du cinéma pour choisir un bijou pour Marie.\nNadia.",
    question: "Que vont faire Sophie et Nadia à midi ?",
    options: ["Acheter un cadeau", "Déjeuner ensemble", "Regarder un film", "Rencontrer une amie"],
    reponseCorrecte: 0,
    explication: "Nadia donne rendez-vous à Sophie pour choisir un bijou pour Marie, soit acheter un cadeau."
  },
  {
    id: 6, niveau: "A2",
    texte: "Stéphane,\nTu peux apporter le dessert jeudi soir ? Claude s'occupe des entrées, Dominique des boissons et moi du plat principal.\nEn invités-surprises d'autres copains de notre terminale S3.\nC'est super de se retrouver tous, dix ans après le Lycée.\nMaryse.",
    question: "Qu'est-ce que Maryse organise ?",
    options: ["Un concours de cuisine entre amis", "Un dîner entre anciens élèves", "Un repas avec toute sa famille", "Une fête de fin d'année scolaire"],
    reponseCorrecte: 1,
    explication: "Maryse réunit des copains de terminale dix ans après le lycée, c'est donc un dîner entre anciens élèves."
  },
  {
    id: 7, niveau: "A2",
    texte: "Monsieur et Madame Mroussi\nMonsieur l'Ambassadeur de France a le plaisir de vous inviter à diner qu'il donnera en sa résidence, le jeudi 14 juillet à 20 heures à l'occasion de la fête nationale.\nTenue de soirée exigée.\nRéponse : sécrétariat-ambafrancea@gmail.com",
    question: "À quoi sont conviés Madame et Monsieur Mroussi ?",
    options: ["À un repas officiel", "À un spectacle musical", "À une fête de fin d'année", "À une soirée dansante"],
    reponseCorrecte: 0,
    explication: "L'Ambassadeur de France les invite à un dîner officiel à sa résidence pour la fête nationale, soit un repas officiel."
  },
  {
    id: 8, niveau: "A2",
    texte: "GRANDE MARCHE POUR DEFENDRE NOS EMPLOIS\nMARDI 12 JUIN\nVENEZ NOMBREUX\nDÉPART PLACE DES NATIONS DEVANT LE CENTRE DES CONGRES À 10H.\nARRIVÉE PRÉVUE VERS MIDI DEVANT LA MAISON DES ENTREPRISES.\nBOULEVARD DES PLATANES.",
    question: "Qu'annonce cette affiche ?",
    options: ["Un salon des entrepreneurs", "Une compétition sportive.", "Une conférence sur le chômage.", "Une manifestation sociale."],
    reponseCorrecte: 3,
    explication: "L'affiche appelle à une grande marche pour défendre les emplois, ce qui correspond à une manifestation sociale."
  },
  {
    id: 9, niveau: "A2",
    texte: "Vous venez d'arriver à Lyon pour suivre des cours à l'université, mais vous ne connaissez pas la ville ? Profitez des conseils de Clémence, lyonnaise, qui vous donne ses adresses pour diner ou faire la fête le soir.\nLesconseilsdeclémence-lyon.fr",
    question: "Que peut-on faire dans les endroits que propose Clémence ?",
    options: ["Cuisiner", "Étudier", "S'amuser", "Se promener"],
    reponseCorrecte: 2,
    explication: "Clémence propose des adresses pour dîner ou faire la fête le soir, ce qui correspond à s'amuser."
  },
  {
    id: 10, niveau: "A2",
    texte: "Semaine du 6 au 10 septembre\nLe restaurant universitaire vous propose des recettes régionales variées au tarif normal.\nRendez-vous de 11 h 15 à 13 h dans la salle du premier étage.\nBon appétit !",
    question: "Que nous propose le restaurant du 6 au 10 septembre ?",
    options: ["Des cours de cuisine", "Des menus différents", "Des plats à emporter", "Des tickets bon marché"],
    reponseCorrecte: 1,
    explication: "Le restaurant propose des recettes régionales variées pendant une semaine, soit des menus différents de l'ordinaire."
  },
  {
    id: 11, niveau: "B1",
    texte: "Vous pratiquez un instrument de musique ?\nVous avez entre 17 et 25 ans ?\nVenez jouer ensemble à la Maison de la Jeunesse et de la Culture !\nRendez-vous tous les mercredis entre 15h et 19h.\nEncadrement par nos animateurs.",
    question: "Que peuvent faire les jeunes dans ce centre culturel ?",
    options: ["Apprendre à jouer d'un instrument de musique", "Faire de la musique avec d'autres personnes", "Organiser des concerts de musique gratuits", "Rencontrer des professionnels de la musique"],
    reponseCorrecte: 1,
    explication: "L'annonce invite des jeunes musiciens à « jouer ensemble », soit faire de la musique avec d'autres personnes."
  },
  {
    id: 12, niveau: "B1",
    texte: "Un salon automobile est un lieu de rêve, mais pas le salon de cette année. Voici mon classement des modèles les plus laids.\n1- La VZ10 : un aspirateur sur quatre roues.\n2- La Tala Aria : pas chère, mais pas belle non plus.\n3- Le cabriolet Augustin : plus large que haute.\nVivement l'année prochaine !",
    question: "Quel est le problème de ces voitures ?",
    options: ["Leur couleur", "Leur forme", "Leur prix", "Leur taille"],
    reponseCorrecte: 1,
    explication: "Les descriptions critiquent l'aspect visuel des voitures (« aspirateur sur quatre roues », « pas belle », « plus large que haute »), soit leur forme."
  },
  {
    id: 13, niveau: "B1",
    texte: "Connaitre deux langues présentes des avantages.\nLa gymnastique mentale du passage d'une langue à une autre est aussi une gymnastique des émotions et du comportement : quand on change de langue, on change de culture.\nQuand le bilingue utilise une langue, la deuxième est aussi activée dans le cerveau, comme pour une traduction. Cette activité mentale est bénéfique pour le cerveau : elle aide à lutter contre certaines maladies.",
    question: "Selon cet article qu'apporte la pratique de deux langues ?",
    options: ["Elle est bonne pour la santé", "Elle facilite la socialisation", "Elle développe la mémoire", "Elle enrichit la personnalité"],
    reponseCorrecte: 0,
    explication: "L'article indique que l'activité mentale du bilinguisme aide à lutter contre certaines maladies, ce qui correspond à un bénéfice pour la santé."
  },
  {
    id: 14, niveau: "B1",
    texte: "Notre entreprise vous propose une formule simple : rendez-vous sur notre site internet où nous évaluons la valeur de votre téléphone portable. Si l'estimation du prix de votre téléphone vous convient, vous nous l'envoyer par la poste en échange, vous recevez la somme correspondante.\n50 000 téléphones ont ainsi été repris au prix moyen de 58 euros. Ceux qui fonctionnent bien sont remis sur le marché en France et ailleurs. La preuve qu'une deuxième vie est possible.",
    question: "Que fait cette entreprise avec les téléphones portables ?",
    options: ["Elle compare leurs caractéristiques", "Elle les donne à des associations", "Elle les remet aux normes", "Elle les revend d'occasion"],
    reponseCorrecte: 3,
    explication: "Les téléphones qui fonctionnent bien sont remis sur le marché, c'est-à-dire revendus d'occasion."
  },
  {
    id: 15, niveau: "B1",
    texte: "Madame,\nJe suis étudiant en français langue étrangère. Je suis passionné par la lecture et les arts. J'aimerais faire un stage dans votre maison d'édition afin de mieux connaître ce domaine professionnel. J'ai déjà plusieurs expériences comme libraire dans mon pays d'origine, la Norvège. Je suis responsable, dynamique et motivé.\nDans l'attente d'une réponse de votre part, veuillez accepter l'expression de mes sincères salutations.\nJörg Hans",
    question: "Que souhaite Jörg ?",
    options: ["Obtenir un poste chez un libraire", "Se spécialiser dans l'art et la culture.", "S'inscrire à un cours de langue.", "Travailler dans une maison d'édition."],
    reponseCorrecte: 3,
    explication: "Jörg demande à faire un stage dans une maison d'édition pour mieux connaître ce domaine, soit travailler dans une maison d'édition."
  },
  {
    id: 16, niveau: "B1",
    texte: "Pour devenir l'unique propriétaire de votre invention, vous devez déposer un dossier auprès de l'Institut National de la Propriété intellectuelle (INPI). Cela permettra de l'exploiter pendant 20 ans. Cette démarche permet d'éviter qu'une invention qui répond à un problème technique donné soit commercialisée par d'autres. Il faut toutefois vérifier que celle-ci n'existe pas déjà sur le marché, avant d'effectuer cette démarche. L'INPI peut vous aider à le savoir (au 08 20 21 32 13 ou sur www.inpi.fr)",
    question: "Dans quel domaine l'INPI propose-t-elle son aide ?",
    options: ["Dans la création d'entreprise", "Dans la promotion de produits", "Dans la protection des droits", "Dans la rédaction des notices"],
    reponseCorrecte: 2,
    explication: "L'INPI aide les inventeurs à protéger leur propriété intellectuelle en évitant que leur invention soit exploitée par d'autres, soit la protection des droits."
  },
  {
    id: 17, niveau: "B1",
    texte: "Vous n'avez plus le courage d'ouvrir un magazine.\nVous ne prenez plus le temps de lire, votre emploi du temps est surchargé, vous passez du temps dans les transports...\nAlors retrouvez le plaisir de la lecture différemment, Socrate Édition transforme la presse écrite en presse audio et garantie la qualité de la lecture grâce à des comédiens. Vous suivez ainsi l'actualité et vous continuez à vous informer.\nRetrouvez nos offres sur notre site internet.",
    question: "Que propose cet éditeur ?",
    options: ["Des enregistrements sonores d'articles de journaux.", "Des extraits choisis de romans classiques", "Des publications résumées de contenus de sites web.", "Des sélections de répliques de théâtres célèbres"],
    reponseCorrecte: 0,
    explication: "Socrate Édition transforme la presse écrite en presse audio, ce qui correspond à des enregistrements sonores d'articles de journaux."
  },
  {
    id: 18, niveau: "B1",
    texte: "Notre association peut aider les étudiants qui habitent seuls et les personnes qui ne gagnent pas beaucoup d'argent à payer leur loyer. Cette aide peut aller jusqu'à 75% de votre loyer et vous permet d'obtenir une réduction sur les frais d'électricité et de gaz. Pour savoir si vous pouvez recevoir cette aide, plusieurs solutions s'offrent à vous :\n1- Vous rencontrez un des conseillers de notre association qui ouvrira un dossier de demande avec vous.\n2- Vous remplissez le questionnaire allocation logement sur notre site web.",
    question: "À qui s'adresse ce message ?",
    options: ["Aux familles qui ont des factures élevées", "Aux jeunes qui veulent vivre en colocation", "Aux locataires qui ont de faibles revenus", "Aux personnes qui cherchent un logement"],
    reponseCorrecte: 2,
    explication: "L'association cible les étudiants seuls et les personnes qui ne gagnent pas beaucoup d'argent, soit des locataires à faibles revenus."
  },
  {
    id: 19, niveau: "B1",
    texte: "Les repas servis dans les avions de ligne ont toujours été tristement réputés pour leur fadeur. Mais il semblerait que les chefs n'y soient pour rien. D'après une étude, les nuisances sonores importantes peuvent en effet réduire la sensibilité des palais rendent la nourriture peu savoureuse. Le vrombissement des réacteurs expliquerait le peu d'enthousiasme des passagers pour les plateaux servis à bord. Les chercheurs ont aussi découvert que des sons agréables pouvaient faire mieux apprécier les mets.",
    question: "Quelle est la conclusion de cette étude ?",
    options: ["L'anxiété en avion diminue la sensation de faim", "La qualité de la nourriture se détériore en altitude", "Le bruit altère le sens du goût des passagers", "Les plats proposés en vol manquent de saveur"],
    reponseCorrecte: 2,
    explication: "L'étude conclut que les nuisances sonores des réacteurs réduisent la sensibilité des palais, soit que le bruit altère le sens du goût des passagers."
  },
  {
    id: 20, niveau: "B2",
    texte: "Ralentissement du traitement de l'information, baisse de l'attention et de notre mémorisation à court terme.\nAvec l'âge le vieillissement du cerveau semble inévitable. Pourtant notre mode de vie. Il est ainsi primordial, après la soixantaine de conserver une vie active, physiquement par une pratique sportive régulière et aussi intellectuellement en sollicitant nos fonctions mentales par un apprentissage permanent. Pour cela, il est essentiel de garder une vie sociale riche d'interactions avec les autres et également de cultiver les activités associatives ou sportives par exemple.",
    question: "Quel est l'objectif des conseils donnés dans ce texte ?",
    options: ["Améliorer les capacités physiques", "Découvrir de nouveaux types de sports", "Développer le cercle de ses relations sociales", "Maintenir les performances de la mémoire"],
    reponseCorrecte: 3,
    explication: "Le texte vise à lutter contre le vieillissement cognitif (mémoire, attention) par une vie active et stimulante, soit maintenir les performances de la mémoire."
  },
{
    id: 21, niveau: "B2",
    texte: "LA NÉO-RURALITÉ EST DEVENUE UN PHÉNOMÈNE DE SOCIÉTÉ.\nCette dénomination date des années 70 : c'est le retour à la terre. Alors que la désertification des campagnes se poursuit, un mouvement de population inverse s'opère. Il concerne des personnes jeunes, sans enfant, portant les valeurs contestataires de Mai 68. Issues de toutes les classes sociales, elles ne recherchent pas spécialement le confort. Elles veulent avant tout vivre une expérience, ce qui les différencie de la population locale et ne facilite pas leur intégration.",
    question: "Que veulent les néo-ruraux ?",
    options: ["Accéder à la propriété privée", "Avoir un mode de vie économique", "Participer à la vie associative", "Tenter une nouvelle aventure"],
    reponseCorrecte: 3,
    explication: "Les néo-ruraux veulent avant tout « vivre une expérience » sans rechercher le confort, ce qui correspond à tenter une nouvelle aventure."
  },
  {
    id: 22, niveau: "B2",
    texte: "Un jour, en réfléchissant aux raisons qui m'avaient éloigné d'une carrière universitaire pourtant bien partie afin de me consacrer à mon travail de médecin praticien, j'ai compris que mon choix tenait en partie du fait que l'on rirait beaucoup plus au contact des êtres humains plongés dans la vie qu'à celui des chercheurs. Comme un animal qui migre vers le sud en hiver, j'avais suivi le soleil de cette vibration qui fabrique du bonheur, du lien, de la santé. Je ne l'ai jamais regretté.",
    question: "Qu'est-ce qui a guidé l'auteur dans ses choix professionnels ?",
    options: ["L'attirance pour les études", "L'appel des pays chauds", "Le besoin d'interaction sociale", "Le désir de reconnaissance"],
    reponseCorrecte: 2,
    explication: "L'auteur a choisi la médecine praticienne pour être au contact des êtres humains, soit par besoin d'interaction sociale."
  },
  {
    id: 23, niveau: "B2",
    texte: "Difficile d'affirmer qu'on attendait beaucoup de ce film. En effet, avec le réalisateur du très moyenne Maison bleue aux commandes, Franck Christian et Articus dans les rôles principaux, cette comédie partait avec plusieurs handicaps du côté du capital sympathie. Des handicaps qui allaient demander un bon paquet de qualités pour nous convaincre qu'imperturbable n'était pas juste un énième bouche-trou pour prime time télévisuel tel que l'on continue à en voir toutes les semaines. Résultat : o miracle, les qualités d'un bon film sont là ! Et même plus encore !",
    question: "Que pense cette personne de ce film ?",
    options: ["Elle le trouve juste bon pour la télévision", "Elle trouve certaines scènes très amusantes", "Elle trouve l'ensemble très réussi", "Elle trouve les acteurs très peu crédibles"],
    reponseCorrecte: 2,
    explication: "Malgré les attentes faibles, le critique conclut que « les qualités d'un bon film sont là ! Et même plus encore ! », soit que l'ensemble est très réussi."
  },
  {
    id: 24, niveau: "B2",
    texte: "La Maison de campagne :\nCe restaurant offre à sa clientèle un bel espace articulé en trois salles : cuisine, salle à manger et salon, décorés dans un joli style provençal. On choisit même sa bouteille de vin à la cave, comme à la maison ! Malheureusement, bien que les plats proposés soient élaborés à partir de produits frais sélectionnés au marché, la cuisine reste une cuisine vue et revue, tellement prévisible qu'il vaudra mieux choisir un restaurant en ville plutôt que se perdre dans cette campagne-là.",
    question: "Sur quel point porte la critique négative faite à ce restaurant ?",
    options: ["L'originalité des plats", "La qualité des produits", "Le cadre du restaurant", "Le prix des menus"],
    reponseCorrecte: 0,
    explication: "Le critique reproche à la cuisine d'être « vue et revue » et « prévisible », soit un manque d'originalité des plats."
  },
  {
    id: 25, niveau: "B2",
    texte: "L'éducation nationale française vient d'inscrire aux programmes scolaires une initiation à la programmation informatique, appelée « code ». Le but n'est pas de faire de tous les enfants des informaticiens, mais il est clair que se limiter à être uniquement un utilisateur passif constituera par la suite, un handicap professionnel. Le chantier est immense, car il faut introduire cette nouvelle matière sans compter sur suffisamment de professeurs formés pour cela. En effet, la vitesse laquelle les technologies numériques ont changée a été bien supérieur à celle de l'évolution de la formation des équipes pédagogiques.",
    question: "Qu'apprend-on sur l'enseignement du code à l'école ?",
    options: ["Les enfants ont des difficultés de concentration dans ce domaine", "Les équipements informatiques des écoles sont devenus obsolètes", "Les établissements doivent se doter d'une connexion illimitée", "Les professeurs avec les compétences nécessaires sont rares"],
    reponseCorrecte: 3,
    explication: "Le texte explique qu'il n'y a pas suffisamment de professeurs formés pour enseigner le code, car la technologie a évolué plus vite que la formation pédagogique."
  },
  {
    id: 26, niveau: "B2",
    texte: "Suite au peu d'intérêt porté à la formation professionnelle à Montréal, cinq comités scolaires ont décidé de lancer un projet pour encourager les élèves à choisir cette voie plutôt que celle des études longues. Ils ont ainsi créé un guide organisationnel et pédagogique régional, un outil qui servira aux enseignants à faire connaître aux élèves les différentes possibilités de carrière dans la formation en apprentissage « d'ici dix ans 30% des besoins de main-d'œuvre vont exiger des compétences professionnelles. Pas des diplômes universitaires » ont rappelé Antonio Bernard, l'un des principaux créateurs du projet.",
    question: "Quel est l'objectif de ce projet ?",
    options: ["Faire la promotion de l'apprentissage d'un métier auprès des jeunes", "Former les professeurs à de nouvelles méthodes d'enseignement", "Présenter les opportunités de stage en entreprise dans la région", "Proposer aux étudiants des stratégies de recherche d'emploi"],
    reponseCorrecte: 0,
    explication: "Le projet vise à encourager les élèves à choisir la formation professionnelle plutôt que les études longues, soit faire la promotion de l'apprentissage d'un métier auprès des jeunes."
  },
  {
    id: 27, niveau: "B2",
    texte: "En écrivant à la main, chacun trouve son moyen de tracer son rythme et choisit son moment et ses mots. Le monde de la communication par texto, lui est celui d'une communication homogène. Avec la numération des échanges, on ne connaît plus l'attente d'une lettre ou d'une carte postale. Rendez-vous avec un ami : un SMS pour qu'on arrive dans cinq minutes, un autre dès qu'on est arrivé un autre si on est en retard. Bienvenue dans un monde sans attente où tous les vides doivent être comblés.",
    question: "Qu'apprend-on sur la communication numérique ?",
    options: ["Elle appauvrit le lexique courant", "Elle modifie le rapport au temps", "Elle provoque la fin du courrier postal", "Elle transforme le geste graphique"],
    reponseCorrecte: 1,
    explication: "Le texte décrit un monde sans attente où chaque instant est comblé par un SMS, montrant que la communication numérique modifie le rapport au temps."
  },
  {
    id: 28, niveau: "B2",
    texte: "Marilyn Monroe\nétait une grande actrice, mais aussi une énigme. Ce qui est frappant c'est que tout le monde l'aime. Il y a toujours toutes générations confondues, une tendresse, une compréhension, un attachement à son égard. Son souvenir reste vif. Elle voulait que ce soit toujours mieux. Toujours plus intense. Elle était en quête de l'absolu, ce qui se traduisait à l'écran par un don de soi total. Elle ne comptait pas. Et Marilyn Monroe continue de hanter les consciences parce qu'elle a donné plus que d'autres.",
    question: "Selon l'auteur qu'est-ce qui explique la passion du public pour l'actrice Marilyn Monroe ?",
    options: ["L'affection qu'elle portait à ses admirateurs", "L'originalité qui caractérisait le choix de ses rôles", "La générosité qu'elle manifestait dans sa vie", "La séduction qui était son principal atout"],
    reponseCorrecte: 2,
    explication: "L'auteur explique que Monroe « a donné plus que d'autres » avec un don de soi total, ce qui correspond à la générosité qu'elle manifestait."
  },
  {
    id: 29, niveau: "B2",
    texte: "Je photographiais parce qu'il le fallait, mais avec toujours le sentiment que cela représentait une perte de temps, une perte d'attention. Pourtant j'ai beaucoup aimé et pas mal pratiqué la photographie dans mon adolescence. Mon père était artiste peintre et bricolait beaucoup la photo. Mais la photographie constitue un métier à part, si je puis dire. Ce que j'ai fait est un travail de photographe au niveau zéro. J'ai publié un livre de photos (Saudades do Brazil que l'on peut traduire par Nostalgie du Brésil) parce qu'autour de moi, on a beaucoup insisté. L'éditeur a choisi un peu moins de 200 clichés parmi tant d'autres.",
    question: "Quelle relation Claude Lévi-Strauss a-t-il avec la photographie ?",
    options: ["Il a hérité de son père cette fascination qui ne l'a jamais quitté", "Il a longtemps souhaité la publication de ses photographies", "Il n'a jamais aimé la photographie qu'il considère comme une perte de temps", "Il déclare que la photographie était une part nécessaire, mais non essentielle à son travail"],
    reponseCorrecte: 3,
    explication: "Il photographiait parce qu'il le fallait, se considère comme un photographe de niveau zéro, mais a néanmoins produit un livre : la photographie était utile mais pas essentielle."
  },
  {
    id: 30, niveau: "C1",
    texte: "Dans une éducation qui prône l'épanouissement de l'enfant, l'obéissance a mauvaise presse.\nEn partie parce qu'elle est confondue avec la soumission.\nMais ça n'en est pas une. C'est une construction culturelle qui demande aussi aux parents de se contrôler. C'est de ce mouvement de retenu que naît l'obéissance intelligente qui fait appel à la participation active de l'enfant et qui est basée sur le respect réciproque, contrairement à celle obtenue par la contrainte et la menace. L'obéissance intelligente demande de réajuster en permanence ses exigences en fonction de l'âge de l'enfant, car le rôle des parents est d'accompagner leur enfant jusqu'au point où il va conquérir sa liberté. Or ce passage ne se fait jamais dans la soumission.",
    question: "Qu'explique le texte au sujet de l'éducation des enfants ?",
    options: ["Elle doit se fonder sur l'estime mutuelle", "Elle s'obtient par le recours à l'autorité", "Elle passe par le suivi de règles immuables", "Elle repose sur la quête du bonheur"],
    reponseCorrecte: 0,
    explication: "Le texte défend une obéissance basée sur le respect réciproque entre parents et enfants, ce qui correspond à une éducation fondée sur l'estime mutuelle."
  },
{
    id: 31, niveau: "C1",
    texte: "Solitude, conflits avec les parents, difficultés scolaires...les adolescents peuvent se confier sur des sites spécialisés, où leur parole sera prise en compte. Fil Santé Jeune a vu ses visites au de 313% ces dernières années. De l'autre côté de l'écran, animateurs et psychologues s'efforcent de maintenir le contact et de prolonger la discussion. L'entreprise est délicate puisque les regards et les gestes ne peuvent être pris en compte par professionnels. Le réconfort naît aussi, et peut-être avant tout, des autres internautes qui vivent une situation similaire.",
    question: "À quelle difficulté se heurtent les spécialistes ?",
    options: ["L'absence totale des signes visuels du langage", "L'opposition des familles à leurs interventions", "La nécessité de modérer le ton des échanges", "Les nombreuses remarques des participants"],
    reponseCorrecte: 0,
    explication: "Les spécialistes ne peuvent pas prendre en compte les regards et les gestes, soit l'absence des signes visuels du langage propres à la communication en ligne."
  },
  {
    id: 32, niveau: "C1",
    texte: "La Commission européenne s'était penchée sur la demande d'adhésion à L'Union de l'Islande moins de deux semaines après la requête preuve que le pays possédait des atouts indéniables. Jusqu'alors l'Islande avait été peu disposée à entrer dans l'Union. Toutefois suite à l'effondrement de ses principaux établissements financiers et à la chute du cours de la couronne, la monnaie islandaise, le pays avait vu dans cette adhésion et dans l'adoption de l'euro un moyen de stabiliser son économie. Pour le président de l'Union, cette volonté d'intégrer l'espace européen renforçait la crédibilité du projet communautaire de l'ancien continent. L'Islande avait fini par retirer sa demande suite à un changement de gouvernement et pour éviter des sujets épineux comme les quotas de pêche.",
    question: "Selon cet article pourquoi l'Islande avait-elle souhaité entrer dans l'Union européenne ?",
    options: ["Pour bénéficier des aides financières de l'Union", "Pour mieux contrôler ses établissements financiers", "Pour redonner de la valeur à la monnaie nationale", "Pour sortir de la crise que son économie subissait"],
    reponseCorrecte: 3,
    explication: "L'Islande a cherché à adhérer à l'UE après l'effondrement de ses banques et la chute de sa monnaie, pour stabiliser son économie, soit sortir de la crise économique."
  },
  {
    id: 33, niveau: "C1",
    texte: "Le terme « famille monoparentale » évoque le plus souvent les mères qui élèvent seules leurs enfants, éludant la réalité des pères confrontés à cette situation. Le développement de la garde alternée a conduit les pères à faire face à des situations auxquelles ils n'étaient pas forcément préparés. De même que les femmes qui élèvent seules leurs enfants sont parfois démunies par l'absence du père, notamment pour exercer leur autorité. Certains hommes ont du mal à trouver leur juste place. Ces hommes font encore l'objet d'un regard particulier de la société. Contrairement aux mères ils doivent très souvent justifier leur statut. On considère encore qu'un enfant, dans les premières années de sa vie, ne peut grandir correctement qu'en présence d'une figure maternelle.",
    question: "Quelle est l'idée abordée par le texte ?",
    options: ["L'absence du père oblige les mères à mettre leur vie affective entre parenthèses", "La société actuelle accepte mal qu'un enfant soit élevé uniquement par son père", "Les pères considèrent que l'absence de la mère doit être absolument compensée", "Les pères seuls reconstruisent vite une vie de couple après une séparation"],
    reponseCorrecte: 1,
    explication: "Le texte montre que les pères monoparentaux sont jugés par la société et doivent justifier leur statut, car on considère la figure maternelle indispensable."
  },
  {
    id: 34, niveau: "C1",
    texte: "Des chercheurs mettent en doute l'idée répandue que la langue dont nous parlons influence notre façon de penser. Ils présentent une recherche sur l'ordre des mots dans la phrase : sujet, verbe, objet pour certaines langues sujet, objet et verbe pour d'autres. Leurs 40 sujets locuteurs d'anglais, d'espagnol, de mandarin, des trucs ont décrit des séquences vidéo dans leur langue d'abord, puis en utilisant des gestes. Si les descriptions verbales diffèrent dans l'ordre des mots selon la langue, les descriptions faites avec les mains reprenaient toutes le même ordre (sujet, objet, verbe), suivant celui des langues des signes inventés par des locuteurs sourds.",
    question: "Quel est le résultat de l'article présenté par ce texte ?",
    options: ["Les gestes révèleraient systématiquement la langue maternelle des locuteurs", "Il existerait un ordre universel de la pensée, indépendant de l'ordre linguistique", "Il y aurait autant de façons de penser que de structures de langue différentes", "Les structures des langues seraient dépendantes de notre expérience du monde"],
    reponseCorrecte: 1,
    explication: "Quelle que soit la langue parlée, les gestes suivent tous le même ordre, ce qui suggère un ordre universel de la pensée indépendant de la langue utilisée."
  },
  {
    id: 35, niveau: "C1",
    texte: "Très controversée, la semaine des quatre jours à l'école est dénoncée dans un rapport parlementaire. Les députés proposent de revenir à la semaine de quatre journées et demie ainsi que de réduire la période des vacances estivales. La mission parlementaire livre des conclusions sévères à l'encontre du rythme scolaire actuel, qui serait « aberrant » et « délirant » pour les écoliers. Selon un député, on peut dire a posteriori que ce soit une erreur de privilégier le rythme des parents des enseignants au détriment de celui des enfants. Dit-il : « En France, la scolarisation annuelle est de 144 jours contre une moyenne de 180 jours pour les pays développés ». Il faut laisser le temps scolaire, estime une experte.",
    question: "Que reprochent les députés à la semaine de quatre jours ?",
    options: ["De laisser trop de temps à l'oisiveté", "De s'écarter du modèle éducatif légal", "De satisfaire avant tous les adultes", "D'être à l'origine de l'échec scolaire"],
    reponseCorrecte: 2,
    explication: "Les députés reprochent au système d'avoir privilégié le rythme des parents et enseignants au détriment des enfants, soit de satisfaire avant tout les adultes."
  },
  {
    id: 36, niveau: "C2",
    texte: "J'ai commencé ma vie comme je la finirais sans doute : au milieu des livres. Dans le bureau de mon grand-père, il y en avait partout ; défense était faite de les épousseter sauf une fois l'an, avant la rentrée d'octobre je ne savais pas encore lire que, déjà je les révérais. Je les touchais en cachette pour honorer mes mains de leur poussière, mais je ne savais trop qu'en faire. Mon grand-père maniait ses objets culturels avec une dextérité d'officiant. Je l'ai vu mille fois se lever d'un air absent, faire le tour de sa table, traverser la pièce en deux enjambées, prendre un volume sans hésiter, le feuilleter en regagnant son fauteuil puis, à peine assis l'ouvrit d'un coup sec à la bonne page.",
    question: "Que fait l'écrivain dans cet extrait ?",
    options: ["Il revit des souvenirs lointains dans le bureau de la maison familiale.", "Il se rappelle une pièce de travail poussiéreuse interdite aux enfants.", "Il raconte son apprentissage de la lecture auprès de son grand-père", "Il évoque ses rentrées scolaires alors qu'il ne savait pas encore lire"],
    reponseCorrecte: 0,
    explication: "L'auteur décrit avec nostalgie le bureau de son grand-père et ses souvenirs d'enfance entouré de livres, soit il revit des souvenirs lointains dans la maison familiale."
  },
  {
    id: 37, niveau: "C2",
    texte: "Le monde de l'éducation a atteint son ambition, devenir la référence nationale en matière d'enseignement. Un succès confirmé par une récente enquête qui nous crédite d'un taux de satisfaction exceptionnellement élevé. Mais nos abonnés sont souvent des établissements scolaires...où le monde de l'éducation est le magazine français le plus « photocopié ». Environ 4000 exemplaires vendus pour plus d'un million cent mille lecteurs ! Un écart vente-lectorat devenu insupportable. Depuis 1974, le monde de l'éducation a accompli de nombreuses transformations. Après 34 ans au service de l'éducation, votre magazine va vivre sa mue la plus importante. De mensuel payant vendu en kiosques ou par abonnement, il va devenir un supplément gratuit proposé avec le quotidien.",
    question: "Qu'est-ce qui a justifié la transformation du monde de l'éducation ?",
    options: ["Une adéquation avec l'attente des lecteurs", "Une diffusion abusive de copies illégales", "Une offre promotionnelle provisoire", "Une perte croissante du nombre d'abonnés"],
    reponseCorrecte: 1,
    explication: "Le magazine est massivement photocopié — 4000 exemplaires pour plus d'un million de lecteurs — ce qui constitue une diffusion abusive de copies non autorisées."
  },
  {
    id: 38, niveau: "C2",
    texte: "Utiliser la comédie, le mime ou la danse pour sensibiliser les riverains, les responsables des établissements, les usagers de la nuit aux nuisances sonores. Telle est la mission des pierrots de la nuit. Ces nouvelles « brigades d'intervention artistique nocturnes » qui sensibilisent le public de nuit. L'originalité de la méthode interpelle les noctambules s'interrogent : qui sont les pierrots de la nuit ? Que font-ils et pourquoi ? L'art de rue n'est pas ressenti comme une agression, en revanche, il force l'écoute et le respecte. Le silence n'est pas une répression, mais une forme de partage.",
    question: "Quel est l'objectif poursuivi par les pierrots de la nuit ?",
    options: ["Améliorer la cohabitation entre les habitants et les noctambules", "Attirer les spectateurs parisiens vers les spectacles de rue", "Développer un nouveau concept des lieux silencieux", "Relancer la fréquentation nocturne des quartiers réservés"],
    reponseCorrecte: 0,
    explication: "Les pierrots sensibilisent riverains et noctambules aux nuisances sonores par l'art de rue, dans une démarche de partage, soit améliorer la cohabitation entre ces deux publics."
  },
  {
    id: 39, niveau: "C2",
    texte: "Si vous pensez pouvoir comprendre un poème, pourvu que l'on vous laisse le temps d'y réfléchir, ou que l'on vous laisse en paix pour vous y absorber, et si vous refusez de voir les choses autrement, alors vous pourriez bien vous priver d'un texte qui a peut-être été écrit expressément pour n'être lu ou réciter que dans des circonstances bien précises, qui elles-mêmes peuvent réclamer l'absence des conditions que vous vous efforcez d'imposer. Ce qu'on appelle « l'usage » que vous l'ayez instituée ou adoptée par imitation, peut ainsi aller à l'encontre de l'efficacité. Il ne suffit pas d'affirmer que « ses règles sont sacro-saintes » elles ne le sont pas, ne peuvent pas l'être et personne n'apportera la preuve qu'elles le sont.",
    question: "Quelles règles établies sont dénoncées dans ce texte ?",
    options: ["Celles des critiques", "Celles des auteurs", "Celles des éditeurs", "Celles des lecteurs"],
    reponseCorrecte: 3,
    explication: "Le texte critique les habitudes de lecture imposées par le lecteur lui-même (lire dans le calme, prendre son temps), soit les règles que les lecteurs s'efforcent d'appliquer."
  }
];