import type { QuestionCE } from "./types";


export const questionsSerie7: QuestionCE[] = [
  // --- NIVEAU A1 ---
  {
    id: 1, niveau: "A1",
    texte: "Je suis dans le métro, j'arrive dans 20 minutes au bureau. Commencez la réunion de travail sans moi. Merci\nJean",
    question: "Pour qui est ce message de Jean ?",
    options: ["Ses amis", "Ses collègues", "Ses enfants", "Ses voisins"],
    reponseCorrecte: 1,
    explication: "Jean parle d'une réunion de travail et demande de la commencer sans lui, le message est donc destiné à ses collègues."
  },
  {
    id: 2, niveau: "A1",
    texte: "Evangélina\n• Choux\n• Paris-brest\n• Eclairs au café\n• Tartes aux pommes\nSur place ou à emporter. Faites votre choix !",
    question: "Que peut-on acheter à Evangélina ?",
    options: ["Des billets de train", "Des légumes", "Des pâtisseries", "Des vêtements"],
    reponseCorrecte: 2,
    explication: "Evangélina propose des choux, paris-brest, éclairs et tartes, ce sont toutes des pâtisseries."
  },
  {
    id: 3, niveau: "A1",
    texte: "De : satoltcourriel.fr\nAu : clients\nObjet : Nouvelles coordonnées\nMadame, Monsieur,\nVoici les nouvelles coordonnées de l'entreprise SATO\nMerci d'écrire maintenant au :\n10, rue Lalou\n34110 Frontignan\nEntreprise Sato\nwww.sato.fr\nTel : 01 43 82 67 42",
    question: "Quelle information a changé ?",
    options: ["L'adresse postale", "Le courrier électronique", "Le numéro de téléphone", "Le site internet"],
    reponseCorrecte: 0,
    explication: "L'objet du mail annonce de « nouvelles coordonnées » et fournit une nouvelle adresse postale à utiliser désormais."
  },
  {
    id: 4, niveau: "A1",
    texte: "VISITE DU CHÂTEAU\nGratuit pour les moins de 12 ans",
    question: "Quelle est l'information affichée sur ce panneau ?",
    options: ["Une adresse", "Une date", "Un horaire", "Un tarif"],
    reponseCorrecte: 3,
    explication: "Le panneau indique que la visite est gratuite pour les moins de 12 ans, ce qui constitue une information tarifaire."
  },
  // --- NIVEAU A2 ---
  {
    id: 5, niveau: "A2",
    texte: "Examen de biologie\nJuin à 15h30 en salle 454.",
    question: "Quelle information manque au sujet de cet examen ?",
    options: ["La date", "La matière", "Le lieu", "L'heure"],
    reponseCorrecte: 0,
    explication: "On connaît la matière (biologie), le lieu (salle 454) et l'heure (15h30), mais le jour précis en juin n'est pas mentionné."
  },
  {
    id: 6, niveau: "A2",
    texte: "Le restaurant « L'Esquinade » a réussi son pari : Introduire l'atmosphère espagnole dans ses plats. Si vous voulez gouter à l'Espagne contemporaine pour votre pause déjeuner cet endroit est pour vous ! Tapas, cœurs de canard, jambon serrano et foie gras s'y rencontrent dans une ambiance chaleureuse, nous faisant voyager entre le sud-ouest de la France et l'Espagne.",
    question: "Que propose ce restaurant ?",
    options: ["D'apprendre à cuisiner des plats étrangers", "D'organiser des repas-spectacles à thèmes", "De gagner un voyage à la fin du repas", "De goûter des spécialités franco-espagnoles"],
    reponseCorrecte: 3,
    explication: "Le restaurant mêle tapas espagnoles et produits du sud-ouest français, proposant ainsi des spécialités franco-espagnoles."
  },
  {
    id: 7, niveau: "A2",
    texte: "Jardin de la Fontaine\nOuverture – Fermeture\nDu 1er septembre au 31 mars    7 h 30 – 18 h 30\nDu 1er avril au 30 juin           7 h 30 – 20 h 30\nDu 1er juillet au 31 août         7 h 00 – 22 h 30",
    question: "Quand peut-on se promener dans le parc après 18 h 30 ?",
    options: ["En décembre", "En février", "En mai", "En mars"],
    reponseCorrecte: 2,
    explication: "Mai se situe dans la période du 1er avril au 30 juin, où le parc ferme à 20h30, permettant donc de s'y promener après 18h30."
  },
  {
    id: 8, niveau: "A2",
    texte: "Pour fêter la retraite de Jean-Louis après 15 ans dans l'entreprise, nous vous proposons de nous retrouver autour d'un verre à 18 heures en salle 6.",
    question: "Que célèbre-t-on ?",
    options: ["Le début des vacances", "Le déménagement de l'entreprise", "Le départ d'un collègue", "Les résultats de l'équipe"],
    reponseCorrecte: 2,
    explication: "Le message invite à célébrer la retraite de Jean-Louis après 15 ans dans l'entreprise, soit le départ d'un collègue."
  },
  {
    id: 9, niveau: "A2",
    texte: "Studio Céline\nL'école de danse « Studio Céline » ouvre ses portes au public le 16 septembre. C'EST GRATUIT : venez essayer nos cours toute la journée. Au programme : salsa, tango, danse moderne et un goûter (boissons et gâteaux) !",
    question: "Qu'est-ce que cette école de danse propose ?",
    options: ["De participer à un concours.", "De s'inscrire à un stage.", "De tester des activités.", "De voir un spectacle."],
    reponseCorrecte: 2,
    explication: "L'école invite le public à « essayer » ses cours gratuitement, c'est-à-dire à tester les activités proposées."
  },
  {
    id: 10, niveau: "A2",
    texte: "Chers amis,\nNous aimerions vous avoir à notre soirée pour fêter la nouvelle année. Soyez là pour 21 h 00 en tenue décontractée, nous sommes entre amis.\nCéline et Redha",
    question: "Pourquoi Céline et Redha invitent-ils des amis ?",
    options: ["Pour un anniversaire", "Pour un mariage", "Pour un réveillon", "Pour un spectacle"],
    reponseCorrecte: 2,
    explication: "Céline et Redha organisent une soirée pour fêter la nouvelle année, ce qui correspond à un réveillon."
  },
  {
    id: 11, niveau: "B1",
    texte: "Marché facile est une application pour téléphone portable qui vous conseille les bons fruits et légumes de saison dans les supermarchés. Elle donne aussi des informations sur le fromage, la viande et le poisson.",
    question: "À quoi sert cette application ?",
    options: ["À acheter sur internet", "À choisir ses produits", "À noter les magasins", "À trouver des recettes"],
    reponseCorrecte: 1,
    explication: "L'application conseille l'utilisateur sur les bons produits de saison, c'est-à-dire qu'elle l'aide à choisir ses produits."
  },
  {
    id: 12, niveau: "B1",
    texte: "La Compagnie des transports urbains recrute des héros comme vous et moi ! Vous pourrez protéger, assister, sécuriser les voyageurs et les agents de l'entreprise et intervenir en cas de besoin. Votre sens de l'observation et vos qualités relationnelles sont vos meilleurs atouts pour réussir dans votre mission. Âgé(e) de 21 à 35 ans, vous mesurez au moins 1 m 75 pour les hommes et 1 m 65 pour les femmes, vous êtes en excellente condition physique. Vous remplissez les conditions d'obtention d'un port d'armes. Salaire mensuel : 1650 euros brut, en poste après formation.",
    question: "Quel type de métier est proposé ?",
    options: ["Agent secouriste", "Agent commercial", "Agent de sécurité", "Agent de circulation"],
    reponseCorrecte: 2,
    explication: "Le poste consiste à protéger, sécuriser et intervenir, avec port d'armes à la clé, ce qui correspond à un agent de sécurité."
  },
  {
    id: 13, niveau: "B1",
    texte: "VOUS MANGEZ ITALIEN, DANSEZ LE FLAMENCO OU APPRENEZ LE SUÉDOIS ?\nPartagez vos images qui montrent que l'Europe fait partie de votre vie. Participez au concours « Fenêtres sur l'Europe ».\nÀ gagner : un séjour à Bruxelles ou un atelier cuisine.",
    question: "Que propose ce concours ?",
    options: ["D'envoyer des photos", "De faire un spectacle.", "De découvrir une langue", "D'inventer une recette"],
    reponseCorrecte: 0,
    explication: "Le concours invite les participants à partager des images, c'est-à-dire à envoyer des photos illustrant l'Europe dans leur quotidien."
  },
  {
    id: 14, niveau: "B1",
    texte: "Adoptées séparément à la naissance, des jumelles indonésiennes se sont retrouvées 29 ans plus tard en Suède. Elles habitaient à 40 km l'une de l'autre mais ne le savaient pas. Leurs parents adoptifs avaient été informés de leur lien de parenté mais avaient arrêté leurs recherches. C'est un message posté sur Facebook par l'une des jumelles qui a permis leur rencontre. Elles sont l'une et l'autre enseignantes !",
    question: "Qu'est-ce que ces jumelles ont en commun ?",
    options: ["Elles adorent utiliser Facebook", "Elles enseignent dans la même école", "Elles habitent dans le même pays", "Elles ont la même famille adoptive"],
    reponseCorrecte: 2,
    explication: "Les deux jumelles se sont retrouvées en Suède, où elles habitaient toutes les deux, donc dans le même pays."
  },
  {
    id: 15, niveau: "B1",
    texte: "« Avec un Master Commerce en poche, je ne pensais pas qu'il serait à ce point difficile de trouver mon premier emploi. Et pourtant. Quel chemin semé d'embûches ! Tout le monde me disait « Ne t'inquiète pas, dans deux ou trois mois tu auras trouvé ! » Sept mois plus tard toujours rien en vue. À 26 ans, je me retrouve sans emploi, toujours chez mes parents. L'avenir ? Je le vois ailleurs, je prépare activement mon départ pour L'Angleterre ».\nAmandine n'est pas une exception chez les jeunes. Les diplômes ne suffisent plus à assurer une situation stable en France et beaucoup de jeunes décident de partir à l'étranger pour obtenir un emploi.",
    question: "De quoi est-il question dans cet article ?",
    options: ["La difficulté de trouver un stage à l'étranger", "La nécessité de s'exiler pour pouvoir travailler", "Le manque de formation des jeunes diplômés", "Le niveau trop faible des salaires proposés"],
    reponseCorrecte: 1,
    explication: "L'article montre que des jeunes diplômés comme Amandine doivent partir à l'étranger faute d'emploi en France, soit la nécessité de s'exiler pour travailler."
  },
  {
    id: 16, niveau: "B1",
    texte: "En hiver et à l'extérieur, pour piloter n'importe quel appareil à écran tactile, il faut enlever ses gants, au risque d'attraper des engelures par les temps de grand froid. Plus de risque de se geler les mains désormais avec ce modèle de gants en chevreau doublé de soie. Les perforations au niveau de l'index permettent un meilleur contact avec l'écran tactile. On pourra être à la pointe de la technologie et de la mode. Mais être à la page a un prix, la paire de gants est plus chère que l'appareil à écran tactile : 370 euros.",
    question: "Quelle est la particularité de ces gants ?",
    options: ["Ils évitent de rayer les appareils à écran tactile", "Ils permettent un contact direct avec un écran tactile", "Ils sont équipés de capteurs reliés à un écran tactile", "Ils sont offerts lors de l'achat d'un écran tactile"],
    reponseCorrecte: 1,
    explication: "Les perforations au niveau de l'index permettent d'utiliser un écran tactile sans enlever les gants, soit un contact direct avec l'écran."
  },
  {
    id: 17, niveau: "B1",
    texte: "Coup de cœur\nLE DIRIGEABLE : La carte varie mais la qualité et le raffinement des plats se maintiennent. Les sauces sont merveilleusement travaillées, les produits de qualité, et les nappes toujours impeccablement blanches. C'est très étonnant de trouver une table si délicieuse dans un quartier aussi éloigné du centre-ville ; malgré cela, la réservation pour le soir est à conseiller. Y aller et y retourner, même en jeans et baskets.",
    question: "Ce guide présente une critique...",
    options: ["Défavorable pour le restaurant", "Nuancée pour le restaurant", "Enthousiaste pour le restaurant", "Objective pour le restaurant"],
    reponseCorrecte: 2,
    explication: "Le critique encense la qualité des plats, les produits, la présentation, et recommande d'y retourner — c'est une critique enthousiaste."
  },
  {
    id: 18, niveau: "B1",
    texte: "Partez à la découverte d'un Paris méconnu, celui des passages secrets, des curiosités historiques, des panoramas étonnants, et même des beautés naturelles en pleine ville. Redressez le dos, levez la tête, admirez le ciel, les toits et l'horizon ! Petits et grands, femmes et hommes, sportifs et paresseux, bébés en poussette, handicapés en fauteuil… venez nous rejoindre ! Vous êtes tous invités ce dimanche à une matinée en famille, entre amis, ou même seuls aux côtés d'inconnus qui ne demandent qu'à faire connaissance. Rendez-vous place de la Bastille à 7 h 30 min.",
    question: "Quel événement est annoncé ?",
    options: ["Une compétition sportive", "Une visite guidée originale", "Une séance de gymnastique", "Une fête familiale en plein air"],
    reponseCorrecte: 1,
    explication: "L'annonce invite à découvrir un Paris méconnu avec passages secrets et curiosités historiques, soit une visite guidée originale ouverte à tous."
  },
  {
    id: 19, niveau: "B1",
    texte: "Dora Bruder, publié en 1997, est considéré comme l'un des meilleurs romans de Patrick Modiano. L'écrivain aime fouiller l'histoire de la capitale et fréquente de nombreuses bibliothèques. Un jour, il tombe sur une annonce parue le 31 décembre 1941 dans Paris-soir :\n« On recherche une jeune fille, Dora Bruder, 15 ans, 1m 55, visage ovale, yeux gris marron, manteau sport gris. Adresser toute indication à M. et Mme Bruder, 41, boulevard Ornano, Paris ».\nModiano va alors s'attacher à lever le mystère de cette disparition en entraînant le lecteur dans les rues du 18e arrondissement.",
    question: "Que fait le journaliste dans cet extrait ?",
    options: ["Il cite un extrait d'une œuvre de Modiano", "Il explique l'idée de départ d'un livre de Modiano", "Il présente le métier de Modiano à ses débuts", "Il raconte la rencontre entre Modiano et sa femme"],
    reponseCorrecte: 1,
    explication: "Le journaliste explique comment la découverte d'une annonce de 1941 a inspiré à Modiano l'écriture de Dora Bruder, soit l'idée de départ du roman."
  },
  {
    id: 20, niveau: "B2",
    texte: "Mathieu Lagouanére et Élodie Calas, deux journalistes, ont fait un tour du monde avec une idée originale : provoquer des rencontres en faisant goûter le roquefort, un fromage traditionnel, fabriqué dans leur région. « Le roquefort était simplement un moyen de faire connaissance avec les habitants. Ses principales caractéristiques, les taches de moisissure et l'odeur, peuvent faire réagir », explique Mathieu. La société Roquefort leur a fourni les fromages. Ils ont raconté leurs aventures dans un blog de voyage.",
    question: "Quel était l'objectif de Mathieu et Élodie ?",
    options: ["Découvrir des recettes locales", "Entrer en contact avec les gens", "Réaliser une opération publicitaire", "Vendre des spécialités françaises"],
    reponseCorrecte: 1,
    explication: "Le roquefort était pour eux un prétexte pour provoquer des rencontres et faire connaissance avec les habitants, soit entrer en contact avec les gens."
  },
{
    id: 21, niveau: "B2",
    texte: "VOUS CHERCHEZ UN CONTRAT À DURÉE INDÉTERMINÉE AVEC UN SALAIRE MOTIVANT ET FIXE ?\nDans le cadre du lancement d'une cellule de télévente, la société ADEM recrute 12 télévendeurs confirmés. Si vous êtes un commercial, si vous êtes dynamique et motivé, contactez-nous :\nrecrutement@ademtel.fr",
    question: "La société ADEM recherche des télévendeurs...",
    options: ["Qui débutent dans le métier de la télévente", "Qui ont de l'expérience dans la télévente", "Qui sont intéressés par un salaire modulable", "Qui recherchent un contrat de courte durée"],
    reponseCorrecte: 1,
    explication: "L'annonce précise qu'elle recrute des télévendeurs « confirmés », c'est-à-dire ayant de l'expérience dans la télévente."
  },
  {
    id: 22, niveau: "B2",
    texte: "Près de 500 écrans alignés sur deux étages et 1200 m² la plus grande salle de jeux vidéo en réseau d'Europe a ouvert ses portes au public à Paris. Baignée dans une ambiance bleu métal et noire, cette salle de jeux à l'ambition de devenir à la fois un stade numérique « où les professionnels et amateurs de jeux vidéo pourront s'affronter à l'occasion de joutes virtuelles et une école de jeux » pour les débutants. Une quinzaine d'animateurs sont constamment présents dans la salle pour guider et initier les joueurs et animer des tournois.",
    question: "En quoi cette salle de jeux est-elle un événement ?",
    options: ["Du fait de sa taille", "Du fait de sa localisation", "Du fait de sa décoration", "Du fait de son personnel"],
    reponseCorrecte: 0,
    explication: "Avec 500 écrans sur deux étages et 1200 m², c'est la plus grande salle de jeux vidéo en réseau d'Europe, ce qui en fait un événement du fait de sa taille."
  },
  {
    id: 23, niveau: "B2",
    texte: "Il est désormais possible de modifier la couleur des yeux. Une technique laser, expérimentée en laboratoire, détruit à vie les pigments de l'iris pour l'éclaircir. La séance se déroule dans le cabinet du spécialiste et en 20 secondes, les yeux du patient passent d'une couleur à l'autre. Mais, comme le laser décolore l'iris, seuls les yeux marrons peuvent espérer passer à une couleur plus claire.",
    question: "Qu'apprend-on sur cette technique laser ?",
    options: ["Elle est en cours de test", "Le changement est définitif", "Tout le monde peut en bénéficier", "Une hospitalisation est nécessaire"],
    reponseCorrecte: 1,
    explication: "Le laser détruit les pigments de l'iris « à vie », ce qui signifie que le changement de couleur est définitif et irréversible."
  },
  {
    id: 24, niveau: "B2",
    texte: "La population d'insectes volants, essentiels aux écosystèmes, a diminué de plus de 75% en près de trente ans en Allemagne sans que les scientifiques ne parviennent à en déterminer la cause avec certitude. Les chercheurs, qui ont mené leur étude dans des zones protégées en Allemagne depuis 1989, suspectent les pesticides agricoles d'être responsables de ce phénomène préoccupant. Selon leurs conclusions publiées dans la revue Plos One, ce fort déclin a été observé quels que soient les changements météorologues, le type d'exploitation des sols ou les caractéristiques de l'habitat.",
    question: "À quoi serait due la baisse du nombre d'insectes ?",
    options: ["L'urbanisation galopante des campagnes.", "La faible étendue des réserves écologiques", "Le dérèglement climatique de la planète", "Les produits utilisés dans les cultures"],
    reponseCorrecte: 3,
    explication: "Les chercheurs suspectent les pesticides agricoles d'être responsables du déclin, ce qui correspond aux produits utilisés dans les cultures."
  },
  {
    id: 25, niveau: "B2",
    texte: "Au cœur de l'histoire\nRevisiter l'histoire de France à la lumière de la société contemporaine, c'est le concept du nouveau magazine proposé par la chaîne de télévision France 5. Les citoyens ont invités à interagir avec la présentatrice et ses invités en communiquant leurs propres témoignages et documents. L'émission se décline en deux temps, avec un documentaire suivi d'un débat en public entre témoins anonymes et acteurs de l'Histoire. Ce débat est construit en amont grâce à des récits d'internautes sur le site de l'émission. Tous ceux qui le souhaitent peuvent poster sur la Toile vidéo, photos et anecdotes personnelles afin de croiser la petite et la grande Histoire.",
    question: "De quelle façon peut-on contribuer à cette nouvelle émission ?",
    options: ["En envoyant des courriels sur la plateforme de l'émission", "En étant sélectionné pour être convié sur le plateau", "En joignant le standard de la chaîne pendant le direct", "En participant à distance au moyen d'une cybercaméra"],
    reponseCorrecte: 0,
    explication: "Les internautes peuvent poster vidéos, photos et anecdotes sur le site de l'émission, ce qui correspond à envoyer des contenus sur la plateforme en ligne."
  },
  {
    id: 26, niveau: "B2",
    texte: "Il veut réhabiliter la charcuterie.\nSi le métier, bien sûr, mais aussi le produit. « On s'imagine un gros bonhomme avec un tablier taché de sang travaillant dans le froid. Ironise Ludovic. C'est tout le contraire ! On travaille avec des matières nobles, dans des labos modernes. On s'éclate en cuisinant, on ne s'ennuie jamais. Quand elle est naturelle, la charcuterie est un excellent aliment, les nutritionnistes devraient faire preuve de discernement. » Autre obsession de ce puriste : la frontière des métiers. « Comment peut-on se prétendre à la fois boucher, charcutier et traiteur ? C'est un non-sens ! ».",
    question: "Quel message cet homme veut-il transmettre ?",
    options: ["L'avenir de son travail est menacé par l'industrie agroalimentaire", "La qualité des produits charcutiers est reconnue par les médecins", "Le passage d'un métier de bouche à un autre se fait facilement", "L'image attachée à sa profession est stéréotypée et peu valorisante"],
    reponseCorrecte: 3,
    explication: "Ludovic ironise sur l'image du charcutier barbu dans le froid et veut montrer que cette image stéréotypée ne correspond pas à la réalité de son métier."
  },
  {
    id: 27, niveau: "B2",
    texte: "Renaissance : un mot porteur de sens à de nombreux égards.\nHistoriquement, elle symbolise le passage vers une nouvelle ère, créatrice, effervescente. Un retour aux sources et des artistes humanistes nourris par l'idée de temps nouveaux faits d'espoir et de confiance en l'homme. Ces multiples lectures ont été source d'inspiration pour la nouvelle collection. C'est aussi l'énergie nouvelle, un regain de vitalité. Avec une ligne plus urbaine, hommes et femmes trouveront dans des coupes près du corps aux couleurs toniques des tenues à leurs mesures pour affronter l'hiver avec sourire et imagination.",
    question: "D'où est tiré ce texte ?",
    options: ["D'un catalogue de styliste", "D'un dictionnaire philosophique", "D'un manuel d'histoire de l'art", "D'une présentation de musée"],
    reponseCorrecte: 0,
    explication: "Le texte évoque une nouvelle collection, des coupes de vêtements et des tenues à porter, ce qui correspond à un catalogue de styliste."
  },
  {
    id: 28, niveau: "B2",
    texte: "L'huile de palme est l'huile la plus produite au monde.\nUn tiers de nos produits de consommation courante en contiennent. Or, on lui reproche beaucoup de choses. Elle serait responsable du cholestérol. Autre problème, environnemental cette fois : la culture du palmier à huile étant très rentable, les surfaces de plantation ne cessent d'augmenter, souvent en lieu et place des forêts. Il existe pourtant d'autres huiles qui peuvent la remplacer mais c'est une solution plus onéreuse pour les industriels du secteur agro-alimentaire.",
    question: "Pourquoi l'huile de palme est-elle produite massivement ?",
    options: ["C'est un produit recherché par les consommateurs", "Elle valorise des méthodes agricoles traditionnelles", "Ses qualités nutritionnelles sont reconnues", "Son exploitation génère des revenus élevés"],
    reponseCorrecte: 3,
    explication: "La culture du palmier à huile est décrite comme « très rentable », ce qui explique la croissance des plantations et la production massive, soit des revenus élevés."
  },
  {
    id: 29, niveau: "B2",
    texte: "Deux mondes s'affrontent : ceux de l'ancienne agriculture et de la nouvelle. Le productivisme soutenu par la chimie a fait progresser comme jamais les rendements agricoles, nourri la planète et abaissé le prix des denrées. Mais il a fait son temps. Les tenants du passé, dont on peut comprendre les motivations, tant les agriculteurs travaillent sous la pression éreintante de la compétitivité, soutiennent qu'il n'existe pas d'autre solution. Notre enquête montre le contraire : l'alliance de la technologie et de l'écologie pour remplacer des substances nocives par une panoplie de techniques inédites offre une alternative originale, crédible et soutenable à la dispersion incontrôlée de composants chimiques nuisibles à tous. C'est la voie de la sagesse autant que de la modernité.",
    question: "Que défend le journaliste ?",
    options: ["L'accès universel à des aliments bon marché.", "L'innovation des procédés de production.", "Le développement du commerce équitable.", "Le partage d'expériences traditionnelles."],
    reponseCorrecte: 1,
    explication: "Le journaliste défend l'alliance de la technologie et de l'écologie comme alternative aux pesticides, soit l'innovation des procédés de production agricole."
  },
  {
    id: 30, niveau: "C1",
    texte: "L'amour à la retraite au théâtre du splendide\nClaire Nadeau, très drôle, et Gérard Rinaldi, très inattendu dans le rôle d'un petit retraité maltraité par sa femme, jouent « Après l'amour » cette comédie, créée il y a dix ans, est reprise au splendide. L'auteur met en scène un couple de petites gens qui sont passées à côté de belles choses. Leur amour est à la retraite. Le paradoxe, c'est qu'on rit beaucoup des mésaventures de Jeanne et Henri dans cette comédie grinçante.",
    question: "Quel est le sujet de la pièce ?",
    options: ["Une histoire d'amour splendide", "Un amour entre deux retraités", "Un homme mal aimé par sa femme", "Un couple qui ne s'aime plus"],
    reponseCorrecte: 3,
    explication: "La pièce met en scène un couple dont l'amour est « à la retraite » et qui est passé à côté de belles choses, soit un couple qui ne s'aime plus."
  },
  {
    id: 31, niveau: "C1",
    texte: "La langue française n'a pas besoin de se défendre. Elle a surtout besoin de se détendre. Aimons-la et laissons-la flâner, adopter des mots d'argot ou étrangers. Laissons-la respirer et s'inspirer comme elle veut. Avec elle, essayons juste d'être... Cool ! En utilisant ce mot, j'imagine déjà l'indignation de ceux qui considèrent l'anglais comme un adversaire. Pour nous, la langue anglaise est peut-être une rivale, mais sûrement pas une ennemie. Elle nous a emprunté nos « rendez-vous », notre « savoir-faire », « déshabillé », « bureau de change », « maître d'hôtel ». Il n'y a aucune contradiction entre, d'une part, encourager la pratique de l'anglais et d'autre part, adopter une stratégie volontariste en faveur de la francophonie.",
    question: "Selon ce journaliste, comment la langue française pourrait-elle évoluer ?",
    options: ["En diversifiant sa politique linguistique", "En modernisant son enseignement", "En s'enrichissant de tous types d'apports", "En valorisant les particularités régionales"],
    reponseCorrecte: 2,
    explication: "Le journaliste invite à laisser le français adopter des mots d'argot ou étrangers et s'inspirer librement, soit s'enrichir de tous types d'apports."
  },
  {
    id: 32, niveau: "C1",
    texte: "Facebook et Twitter sont omniprésents au collège.\nNous pourrions détourner les yeux en prétendant qu'ils n'ont rien à voir avec les compétences et savoirs acquis à l'école. Mais, ces messageries instantanées doivent être prises au sérieux par les enseignants, au sens où elles ne sont pas une mode mais un mode de communication qui conditionne les relations sociales. Les réseaux sociaux appartiennent déjà à la cité et seront partie prenante de notre vie demain. Ainsi, des pétitions se signent sur internet, les renseignements sur autrui se prennent aussi sur la Toile. Il s'agit alors pour l'enseignant d'apprendre aux jeunes des comportements responsables dans l'usage des modes de communications telles que Facebook et autres Twitter.",
    question: "Que pense l'auteur des réseaux sociaux ?",
    options: ["Il est indispensable de savoir s'en servir correctement", "Il faut éviter de les utiliser dans le cadre scolaire", "Ils représentent un danger pour les libertés individuelles", "Ils sont incontournables en tant qu'outils d'enseignement"],
    reponseCorrecte: 0,
    explication: "L'auteur appelle les enseignants à former les jeunes à des comportements responsables sur les réseaux sociaux, soit à savoir s'en servir correctement."
  },
  {
    id: 33, niveau: "C1",
    texte: "Les anomalies ne doivent pas masquer le degré de cohérence qui fonde le code graphique. S'il y a plusieurs graphies pour un même son, leur distribution n'est pas aléatoire : le choix est souvent corrélé à des critères de position ou à des correspondances morphologiques. Les lettres muettes, à l'occasion, soulignent les flexions ou les dérivations. Certaines consonnes doubles sont clairement interprétables. De plus, certaines graphies étymologiques ne sont pas dépourvues de toute signification. Et bien d'autres observations iraient dans le même sens. Dès lors pourquoi renoncer à enseigner ce noyau intelligible de notre écriture ? L'orthographe, dans ses fondements, peut faire l'objet d'un apprentissage raisonné. Une pédagogie fondée sur la réflexion est plus valorisante qu'une acquisition basée sur le « par cœur » et la répétition, en même temps qu'elle assure des connaissances plus solides. En outre, elle permet de mieux cerner, par contraste, les zones d'ombre et les bizarreries : La perception des exceptions sera d'autant plus aisée qu'on aura pris conscience des régularités.",
    question: "Que pense l'auteur de l'orthographe française ?",
    options: ["Elle devrait être réformée de fond en comble", "Elle est parsemée de prescriptions irrationnelles", "Elle répond à certaines règles compréhensibles", "Elle se maîtrise par des exercices de mémorisation"],
    reponseCorrecte: 2,
    explication: "L'auteur montre que les règles orthographiques ont une logique cohérente et peuvent s'apprendre par la réflexion, soit qu'elles répondent à des règles compréhensibles."
  },
  {
    id: 34, niveau: "C1",
    texte: "« Le fait du roi »\nUn roman d'A. Thonon\nC'est l'histoire d'un homme qui prend l'identité d'un autre, mort, en se glissant dans sa peau, dans sa vie, dans sa maison... Rien ne sert de raconter l'intrigue de ce roman tant elle est simple et sans surprise. L'écriture de l'auteur reste cependant toujours aussi piquante et agréable à lire. Le héros principal, quant à lui, est dépeint avec une certaine profondeur.",
    question: "Sur quel point porte la critique négative faite à ce livre ?",
    options: ["La description du personnage", "La longueur du texte", "La qualité de l'écriture", "Le déroulement des événements"],
    reponseCorrecte: 3,
    explication: "Le critique pointe une intrigue « simple et sans surprise », ce qui constitue une critique négative portant sur le déroulement des événements."
  },
  {
    id: 35, niveau: "C1",
    texte: "Très controversée, la semaine de quatre jours à l'école est dénoncée dans un rapport parlementaire. Les députés proposent de revenir à la semaine de quatre journées et demie et de réduire la période des vacances estivales. La mission parlementaire livre des conclusions sévères à l'encontre du rythme scolaire actuel, qui serait « aberrant » et « délirant » pour les écoliers. Selon un député, on peut dire, a posteriori, que c'est une erreur, on a privilégié le rythme des parents et des enseignants au détriment de celui des enfants, dit-il. En France, la scolarisation annuelle est de 144 jours, contre une moyenne de 180 pour les pays développés.\n« Il faut laisser le temps scolaire », estime une experte.",
    question: "Que reprochent les députés à la semaine de quatre jours ?",
    options: ["De laisser trop de temps à l'oisiveté", "De s'écarter du modèle éducatif légal", "De satisfaire avant tous les adultes", "D'être à l'origine de l'échec scolaire"],
    reponseCorrecte: 2,
    explication: "Les députés reprochent au rythme actuel d'avoir été conçu au profit des parents et enseignants, au détriment des enfants, soit de satisfaire avant tout les adultes."
  },
  {
    id: 36, niveau: "C2",
    texte: "Un vingt-sixième album de François Hardy, la pluie sans parapluie est forcément un événement. On sait que le public qui achète encore des disques passe volontiers à la caisse, pour montrer sa fidélité, ou simplement son envie de vibrer avec cette voix unique et si familière, avec laquelle elle semble d'ailleurs plus en confiance que jamais. Elle module, appuie, interprète, joue avec souplesse de son phrasé, alors que les aficionados se contenteraient juste de ce grain unique et révéré. C'est un album pour ceux qui ont le temps, qui ne consomment pas la musique en tant qu'application sonore de la vie actuelle. Il faut se retrancher pour en saisir la saveur et la goûter. Un disque comme autrefois, avec un son soigné et de l'émotion. Mais surtout une élégance comme on n'en fait plus.",
    question: "Selon le journaliste, quel type de public pourrait s'intéresser au dernier album de F. Hardy ?",
    options: ["Les acheteurs opposés au téléchargement illégal", "Les amateurs de subtilité et de raffinement musical", "Les admirateurs inconditionnels de l'interprète", "Les curieux en mal de musique expérimentale"],
    reponseCorrecte: 1,
    explication: "Le journaliste décrit un album exigeant, d'une grande élégance, à savourer lentement, destiné à ceux qui apprécient la subtilité et le raffinement musical."
  },
  {
    id: 37, niveau: "C2",
    texte: "L'avenir est dans la formation de la jeunesse, dans l'innovation, dans la recherche. Pour prendre pleinement ses responsabilités, l'université de Nantes propose un nouveau modèle universitaire en France, décloisonné, qui ressemble les acteurs de l'enseignement supérieur et de la recherche (grandes écoles, organismes de recherche, centre hospitalier universitaire...) Ce nouveau modèle remet au centre des préoccupations la question de l'accès à un enseignement supérieur qualitatif pour le plus grand nombre. Il a l'ambition de créer les conditions de réussite et d'épanouissement pour tous ses étudiants et de permettre des innovations majeures.\nAu travers de ce projet de nouvelle université, le président et son équipe défendent une vision innovante et proposent un nouveau modèle qui conjugue exigence et main tendue, excellence et lien social.",
    question: "Quel est l'objectif de cette université ?",
    options: ["Attirer davantage d'étudiants brillants", "Être à la pointe de la technologie", "Ouvrir ses cours à un public élargi", "Proposer des disciplines inédites"],
    reponseCorrecte: 2,
    explication: "L'université vise à rendre l'enseignement supérieur de qualité accessible au plus grand nombre, soit ouvrir ses cours à un public élargi."
  },
  {
    id: 38, niveau: "C2",
    texte: "Mara Maudet, à son arrivée en France, ne constate que la politique d'insertion des foyers démunis et celle dédiée à la petite enfance sont déconnectées l'une de l'autre. Pour cette Brésilienne « un parent sans emploi doit être prioritaire pour obtenir une place en crèche. Tout le contraire des critères actuels. Elle crée alors l'IEPC (Institut d'éducation et des pratiques Citoyennes) et constitue un réseau de crèches associatives dont le principe est qu'en échange d'une place pour son enfant sur une plage horaire de 13 heures, le parent célibataire – le plus souvent des mères – s'engage à trouver un emploi dans les mois suivants. Elle bénéficie alors, dans les locaux de la crèche, d'un accompagnement professionnel personnalisé.",
    question: "Quel est l'objectif de l'IEPC ?",
    options: ["Embaucher des parents défavorisés", "Faciliter l'intégration professionnelle", "Proposer des tarifs préférentiels en crèche", "Trouver un accueil provisoire pour les enfants"],
    reponseCorrecte: 1,
    explication: "L'IEPC offre des places en crèche en échange d'un engagement à trouver un emploi, avec un accompagnement professionnel, soit faciliter l'intégration professionnelle des parents."
  },
  {
    id: 39, niveau: "C2",
    texte: "Treize jeunes cinéastes, achevant leur formation dans les plus prestigieuses écoles d'animation, ont planché sur quelques vers de Paul Éluard, livrant leur vision originale de son univers poétique. S'inscrivant dans la suite des programmes de courts-métrages dédiés à Prévert et Apollinaire, ce nouveau florilège de la série en sortant de l'école met en lumière l'œuvre d'un « apparenté surréaliste » dont la notoriété est souvent, hélas, réduite au seul – et incontournable – poème Liberté... Sa délicatesse, en amour comme en fantaisie, s'avère un combustible merveilleux pour de jeunes cinéastes.",
    question: "Selon cette critique, quel est l'apport de ce dernier ensemble de courts-métrages ?",
    options: ["Il constitue une création artistique novatrice", "Il établit des ponts avec d'autres auteurs", "Il fait connaître les travaux d'un écrivain", "Il ouvre la voie à de prochaines réalisations"],
    reponseCorrecte: 2,
    explication: "Les courts-métrages mettent en lumière l'œuvre d'Éluard, souvent réduite au seul poème Liberté, ce qui correspond à faire connaître les travaux d'un écrivain."
  }
];