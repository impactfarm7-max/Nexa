import type { QuestionCE } from "./types";

export const questionsSerie5: QuestionCE[] = [
  // --- NIVEAU A1 ---
  {
    id: 1, niveau: "A1",
    texte: "Heures d'ouverture du service consulaire :\nLe service consulaire est ouvert au public les lundis, mercredis et jeudis de 8 h à 14 h et les mardis et vendredis de 14 h 30 à 18 h.",
    question: "Quand le service est-il fermé au public ?",
    options: ["Le lundi matin", "Le mardi matin", "Le mercredi matin", "Le jeudi matin"],
    reponseCorrecte: 1, explication: "Le mardi, le service n'ouvre qu'à 14 h 30 — il est donc fermé le mardi matin."
  },
  {
    id: 2, niveau: "A1",
    texte: "La Table « votre restaurant d'entreprise »\nOUVERT DU LUNDI AU VENDREDI\nSERVICE DE 12 H À 14 H\nFERMETURE : SAMEDI/DIMANCHE",
    question: "Que peut-on faire dans ce lieu ?",
    options: ["Boire un thé ou un café l'après-midi", "Inviter des enfants pour le goûter", "Manger avec des collègues à midi", "Partager un repas entre amis le soir"],
    reponseCorrecte: 2, explication: "Le restaurant est ouvert du lundi au vendredi, uniquement de 12 h à 14 h, soit l'heure du déjeuner avec des collègues."
  },
  {
    id: 3, niveau: "A1",
    texte: "Madame,\nSuite à votre courrier du 17 juin dernier, je vous envoie le catalogue de nos produits.\nTrès cordialement\nSOPHIE LELOUX Service clientèle",
    question: "Pourquoi est-ce que Sophie LELOUX écrit cette lettre ?",
    options: ["Elle cherche une vendeuse.", "Elle demande un renseignement.", "Elle informe une cliente.", "Elle prend un rendez-vous"],
    reponseCorrecte: 2, explication: "Sophie LELOUX envoie un catalogue en réponse à un courrier, ce qui correspond à informer la cliente sur les produits."
  },
  {
    id: 4, niveau: "A1",
    texte: "Karim, pense à appeler ta sœur pour avoir de ses nouvelles",
    question: "Que doit faire Karim ?",
    options: ["Aller chez sa sœur", "Inviter sa sœur", "Jouer avec sa sœur", "Téléphoner à sa sœur"],
    reponseCorrecte: 3, explication: "Le message dit explicitement d'« appeler » sa sœur, ce qui signifie lui téléphoner."
  },
  // --- NIVEAU A2 ---
  {
    id: 5, niveau: "A2",
    texte: "Antoine,\nS'il te plaît, viens dans mon bureau après la réunion.\nMerci\nLudovic",
    question: "Que doit faire Antoine ?",
    options: ["Apporter un document", "Organiser un entretien", "Rencontrer un collègue", "Téléphoner à Ludovic"],
    reponseCorrecte: 2, explication: "Ludovic demande à Antoine de venir dans son bureau, c'est-à-dire de rencontrer un collègue."
  },
  {
    id: 6, niveau: "A2",
    texte: "Chers parents,\nLa fête annuelle de notre école se déroulera cette année le samedi 12 juin. Pour que cette journée soit réussie, nous faisons une fois encore appel à votre participation. Nous avons besoin d'adultes pour animer les stands et surveiller les jeux. Faites-nous part de vos disponibilités.\nLa directrice",
    question: "Que demande la directrice l'école ?",
    options: ["De la nourriture", "De l'argent", "Des idées", "Des volontaires"],
    reponseCorrecte: 3, explication: "La directrice demande des adultes pour animer et surveiller, c'est-à-dire des volontaires."
  },
  {
    id: 7, niveau: "A2",
    texte: "L'association des Bretons vous offre une « Soirée musicale irlandaise », vendredi 10 novembre à 20h 30. À la fin du spectacle, une vente de boissons sera organisée et vous pourrez goûter des spécialités d'Irlande.",
    question: "Qu'est-ce que propose cette association ?",
    options: ["Un concert gratuit", "Un concours de chant", "Un concours de cuisine", "Un voyage à l'étranger"],
    reponseCorrecte: 0, explication: "L'association propose une soirée musicale, c'est-à-dire un concert. L'entrée n'étant pas mentionnée comme payante, c'est un concert gratuit."
  },
  {
    id: 8, niveau: "A2",
    texte: "La cuisine de Jean-Emile\nJean-Émile Nodier, chef depuis 10 ans, propose : DES COURS DE CUISINE À DOMICILE pour une à quatre personnes. Apprenez à cuisiner des recettes de qualité.",
    question: "Qu'est-ce que cette annonce propose ?",
    options: ["D'apprendre à préparer des plats chez soi.", "De devenir un chef cuisinier professionnel.", "De réaliser des repas pour de grands groupes.", "De trouver de bonnes recettes sur internet."],
    reponseCorrecte: 0, explication: "L'annonce propose des cours de cuisine à domicile, c'est-à-dire apprendre à préparer des plats chez soi."
  },
  {
    id: 9, niveau: "A2",
    texte: "Objet : réunion de service\nNotre prochaine réunion de service aura lieu mercredi 12 octobre à 13 h en salle 3. Nous discuterons des nouveaux produits et de l'organisation de la fête pour le départ à la retraite de Mme Fournival.\nE. Frachon.",
    question: "Que va-t-il se passer le mercredi 12 ?",
    options: ["Des collègues vont changer de service", "Les employés vont préparer une fête", "M. Frachon va quitter l'entreprise", "Mme Fournival va arriver dans la société"],
    reponseCorrecte: 1, explication: "La réunion portera sur l'organisation de la fête pour le départ à la retraite de Mme Fournival, donc les employés vont préparer une fête."
  },
  {
    id: 10, niveau: "A2",
    texte: "Chers collègues,\nNous vous informons que la réunion parents-professeurs des classes de seconde prévue pour ce samedi est reportée au samedi prochain à midi. Votre présence est obligatoire.\nLa direction du lycée",
    question: "À qui est adressé ce message ?",
    options: ["Aux élèves", "Aux étudiants", "Aux parents", "Aux professeurs"],
    reponseCorrecte: 3, explication: "Le message commence par « Chers collègues » et est envoyé par la direction du lycée, donc il s'adresse aux professeurs."
  },
  // --- NIVEAU B1 ---
  {
    id: 11, niveau: "B1",
    texte: "Un voyage à prix raisonnable en train de nuit, en couchettes 6 places. De centre-ville à centre-ville, vous arrivez plus tôt, vos fins de semaine, durent plus longtemps. Boissons chaudes et gâteaux vous sont offerts au réveil.",
    question: "Le présent message propose...",
    options: ["Une restauration simple et efficace", "Un long week-end à bas prix", "Un court séjour en centre-ville", "Un voyage en train couchettes"],
    reponseCorrecte: 3, explication: "L'annonce décrit explicitement un voyage en train de nuit en couchettes 6 places à prix raisonnable."
  },
  {
    id: 12, niveau: "B1",
    texte: "Le « ski lent » privilégie le plaisir.\nLe plaisir du ski, ce n'est plus seulement la vitesse et la performance. Certain skieurs cherchent avant tout à prendre leur temps, à vivre une nouvelle expérience : le ski lent répond à ces souhaits. Ainsi des stations proposent des zones tranquilles, où la vitesse est interdite. On descend sans se presser, on soigne son style, sans nécessairement être débutant. Une discipline qui séduit et qui demande peu d'entraînement.",
    question: "Que propose-t-on aux skieurs dans ce texte ?",
    options: ["D'améliorer leur niveau de compétence", "De pratiquer leur sport différemment", "De se préparer à des compétitions", "De tester un autre type de matériel"],
    reponseCorrecte: 1, explication: "Le ski lent propose une nouvelle façon de pratiquer le ski, orientée plaisir et style plutôt que vitesse, soit pratiquer leur sport différemment."
  },
  {
    id: 13, niveau: "B1",
    texte: "Monsieur,\nTitulaire d'une licence en informatique de l'université du Maroc, je souhaiterais poursuivre un cursus à Paris XII dans le cadre d'un master 1 d'informatique. Intégrer votre université devrait me permettre d'atteindre le niveau d'expertise que je souhaite acquérir dans un métier qui est pour moi une vraie passion. Vous trouverez, ci-joint, mon dossier de candidature complet. En espérant que ma candidature saura retenir votre attention, je vous prie de croire, Monsieur, à l'expression de ma salutation distinguée.\nSélim Néri",
    question: "Qui est Sélim Néri ?",
    options: ["Un candidat à des études supérieures", "Un étudiant en quête d'un stage.", "Un informaticien en recherche d'emploi.", "Un lycéen en demande d'orientation."],
    reponseCorrecte: 0, explication: "Sélim Néri souhaite poursuivre un master 1 d'informatique, il est donc candidat à des études supérieures."
  },
  {
    id: 14, niveau: "B1",
    texte: "Après les cartes de cinéma illimitées, la carte Scène+ ! Paris est la première ville à tester cette formule : des places à tarifs réduits à utiliser quand on veut, dans quarante théâtres environ, pour aller voir plus de 150 pièces. On achète la carte, valable un mois ou un semestre et on peut aller dans les petites scènes de théâtre parisiennes qui accueillent surtout des comédies populaires plutôt que des pièces classiques.",
    question: "Que peut-on faire avec la carte Scène+ ?",
    options: ["Assister à des spectacles", "Obtenir de meilleures places", "Rencontrer des comédiens", "Suivre des visites guidées"],
    reponseCorrecte: 0, explication: "La carte Scène+ permet d'aller voir des pièces de théâtre dans une quarantaine de salles, soit assister à des spectacles."
  },
  {
    id: 15, niveau: "B1",
    texte: "Il faut savoir que toute personne qui n'a pas pratiqué d'activité physique pendant un certain temps doit accepter de repartir de zéro. Même si la maîtrise du geste peut revenir rapidement, le corps, lui, mettra plus de temps avant de pouvoir faire face aux efforts demandés... D'autant plus qu'entre-temps il aura vieilli. Une période d'environ trois mois, avec des entraînements réguliers et progressifs, est indispensable dans un premier temps. Ensuite, le « nouveau sportif » pourra se lancer des défis pour améliorer ses performances.",
    question: "Quel conseil donne l'auteur au « nouveau sportif » ?",
    options: ["Il faut apprendre au niveau où on avait arrêté", "Il faut s'entraîner avec des personnes de son âge", "Il faut se fixer des objectifs élevés dès le départ", "Il faut se remettre à bouger de façon régulière"],
    reponseCorrecte: 3, explication: "L'auteur recommande de reprendre progressivement avec des entraînements réguliers, c'est-à-dire se remettre à bouger de façon régulière."
  },
  {
    id: 16, niveau: "B1",
    texte: "Bien se vêtir, ce n'est pas seulement succomber au dernier cri de la mode, c'est également prendre conscience que les conditions de production du textile sont une menace pour notre écosystème. Saviez-vous par exemple que le coton est très gourmand en pesticides ? Chez Fibris, vous ne trouverez que de la fibre naturelle, sans adjonction de produits chimiques, issue de cultures biologiques pour des habits au confort incomparable.",
    question: "Quel genre de produits vend la société Fibris ?",
    options: ["Des tenues particulièrement à la mode", "Des produits alimentaires biologique", "Des engrais naturels pour les plantes", "Des vêtements en tissus non traités"],
    reponseCorrecte: 3, explication: "Fibris vend des vêtements en fibre naturelle sans produits chimiques, c'est-à-dire en tissus non traités."
  },
  {
    id: 17, niveau: "B1",
    texte: "En hiver et à l'extérieur, pour piloter n'importe quel appareil à écran tactile, il faut enlever ses gants, au risque d'attraper des engelures par les temps de grand froid. Plus de risque de se geler les mains désormais avec ce modèle de gants en chevreau doublé de soie. Les perforations au niveau de l'index permettent un meilleur contact avec l'écran tactile. On pourra être à la pointe de la technologie et de la mode. Mais être à la page a un prix, la paire de gants est plus chère que l'appareil à écran tactile : 370 euros.",
    question: "Quelle est la particularité de ces gants ?",
    options: ["Ils évitent de rayer les appareils à écran tactile", "Ils permettent un contact direct avec un écran tactile", "Ils sont équipés de capteurs reliés à un écran tactile", "Ils sont offerts lors de l'achat d'un écran tactile"],
    reponseCorrecte: 1, explication: "Grâce aux perforations au niveau de l'index, ces gants permettent un contact direct avec l'écran tactile sans enlever ses gants."
  },
  {
    id: 18, niveau: "B1",
    texte: "La télévision, les jeux vidéo, les ordinateurs ont envahi les foyers. Alors, certains parents craignent le risque d'addiction pour leurs enfants. Quel est le quota d'heures quotidien devant les écrans à ne pas dépasser ? Pour les psychologues, le critère à prendre en compte est celui de l'exclusivité. Si les jeux vidéo et internet sont l'unique source de relation et de distraction pour un adolescent, alors, il faut s'inquiéter et agir. Réguler la consommation d'images, c'est le travail des parents qui doivent faire des écrans des objets d'échange familial et non un refuge individuel.",
    question: "Que devraient faire les parents concernant les jeux vidéo et internet ?",
    options: ["Donner à ces activités une fonction éducative.", "Faire de ces loisirs des moments de partage.", "Fixer des plages horaires pour jouer en ligne.", "S'informer auprès des professionnels de santé."],
    reponseCorrecte: 1, explication: "Les psychologues conseillent de faire des écrans des « objets d'échange familial », c'est-à-dire des moments de partage."
  },
  {
    id: 19, niveau: "B1",
    texte: "Le saviez-vous ?\nUne jambe cassée ? Une grosse fièvre ? Vous êtes dans l'incapacité de venir à la bibliothèque universitaire. Si vous avez une connexion internet efficace, vous pouvez commander en ligne les ouvrages qui vous intéressent et les recevoir chez vous ! Conditions et modalités sur www.buparisdescartes.fr",
    question: "Que propose cette annonce ?",
    options: ["Une bourse d'échange de livres", "Une offre d'accès à internet", "Un service de prêt à domicile", "Une assistance de soin chez soi"],
    reponseCorrecte: 2, explication: "La bibliothèque propose de commander des livres en ligne et de les recevoir chez soi, soit un service de prêt à domicile."
  },
  // --- NIVEAU B2 ---
  {
    id: 20, niveau: "B2",
    texte: "Plus de peur que de mal pour ce petit garçon, près de Lorient, qui, dimanche soir, mangeait une part de fromage. « Papa, le fromage, il est dur !!!... » Dimanche, Youenn, 4ans, mange une portion individuelle de fromage dans la maison familiale. Ses parents, occupés dans la pièce d'à côté, l'entendent tousser. « Comme s'il voulait vomir », raconte Yann, son père. En fait, l'enfant est en train de recracher... un bout de plastique qui aurait pu l'étouffer.",
    question: "Qu'est-il arrivé à Youenn?",
    options: ["Il a avalé un mauvais morceau de fromage.", "Il a trouvé quelque chose dans son fromage.", "Il est tombé malade en mangeant du fromage.", "Il s'est fait mal aux dents avec le fromage."],
    reponseCorrecte: 1, explication: "Youenn a trouvé et recraché un bout de plastique dans son fromage — il a trouvé quelque chose dans son fromage."
  },
  {
    id: 21, niveau: "B2",
    texte: "Mathieu Lagouanère et Élodie Calas, deux journalistes, ont fait un tour du monde avec une idée originale : provoquer des rencontres en faisant goûter le roquefort, un fromage traditionnel, fabriqué dans leur région. « Le roquefort était simplement un moyen de faire connaissances avec les habitants. Ses principales caractéristiques, les taches de moisissure et l'odeur, peuvent faire réagir », explique Mathieu. La société Roquefort leur a fourni les fromages. Ils ont raconté leurs aventures dans un blog de voyage.",
    question: "Quel était l'objectif de Mathieu et Élodie ?",
    options: ["Découvrir des recettes locales", "Entrer en contact avec les gens", "Réaliser une opération publicitaire", "Vendre des spécialités françaises"],
    reponseCorrecte: 1, explication: "Mathieu précise que « le roquefort était simplement un moyen de faire connaissances avec les habitants », soit entrer en contact avec les gens."
  },
  {
    id: 22, niveau: "B2",
    texte: "Monsieur Lereux,\nJ'ai l'honneur de vous informer que votre nom a été sélectionné pour « Magasins en fête »! Dès à présent, rendez-vous dans votre magasin, un bulletin de participation vous sera remis en caisse à partir de 25 euros d'achat ! C'est la dernière étape, alors n'attendez plus, venez remplir ce bulletin et gagnez un voyage de rêve, ou bien l'un de nos nombreux autres cadeaux.",
    question: "Pourquoi Monsieur Lereux doit-il se rendre en magasin ?",
    options: ["Pour bénéficier d'une promotion.", "Pour participer à la finale d'un jeu.", "Pour recevoir un coupon de voyage.", "Pour retirer un chèque cadeau."],
    reponseCorrecte: 1, explication: "M. Lereux doit aller remplir le bulletin de participation pour « Magasins en fête », c'est-à-dire participer à la finale d'un jeu."
  },
  {
    id: 23, niveau: "B2",
    texte: "Savoir opter pour la bonne route n'est pas tout. L'ultime clé pour gagner la course de la route du rhum, c'est la connaissance de soi et tout particulièrement de ses rythmes de sommeil. C'est un des aspects les plus méconnus de la voile de compétition. Mais c'est sur la faculté de récupération que peut se jouer un Podium. Ainsi, Alain Gautier reconnaît avoir perdu la dernière Route du rhum parce qu'il n'a pas su, dès les premiers jours de la course, gérer correctement ses phases de repos. « À la fin, j'ai manqué de lucidité et j'ai commis des erreurs », avoue-t-il après sa défaite.",
    question: "Quel conseil donne le journaliste pour remporter la course ?",
    options: ["Connaître ses adversaires", "Cultiver sa concentration", "Dormir efficacement", "Ménager ses efforts"],
    reponseCorrecte: 2, explication: "Le texte insiste sur l'importance des rythmes de sommeil et de la récupération — Alain Gautier a perdu faute de gérer ses phases de repos, soit l'importance de dormir efficacement."
  },
  {
    id: 24, niveau: "B2",
    texte: "Journée Portes Ouvertes à PolyInTours.\nVenez rencontrer les étudiants, enseignants et associations de PolyTech7ours\nLe samedi 12 février, 9H à 10\nSans interruption\n• Espaces d'information présents sur les trois sites de l'école.\n• Présentation des Modes et des métiers d'ingénieur par les responsables des spécialités sur chaque site.\n• Visites guidées des salles de travaux pratiques. Des centres de documentation, des laboratoires de recherche et de langues.\n• Démonstrations de projets réalisés dans nos cursus.\n• Présentation des associations étudiantes.",
    question: "Quel est l'objectif de cette journée ?",
    options: ["Découvrir le travail de recherche en laboratoire.", "Faire découvrir les formations pour devenir ingénieur.", "Inaugurer l'ouverture d'un campus universitaire.", "Obtenir des conseils afin de créer une association."],
    reponseCorrecte: 1, explication: "La journée présente les métiers d'ingénieur et les formations disponibles, soit faire découvrir les formations pour devenir ingénieur."
  },
  {
    id: 25, niveau: "B2",
    texte: "Près du Nil, le futur musée égyptien.\nEn 2002, l'Égypte lance un appel d'offre pour la construction du Grand Musée. Des architectes de renommée mondiale proposent leurs projets. C'est celui de Shih-Fu Peng, un jeune architecte inconnu, qui est choisi sur une idée simple : construire un énorme bâtiment face aux pyramides détruirait l'harmonie du plateau de Gizeh, il faut donc bâtir cinquante mètres en contrebas. Ainsi ne verra-t-on jamais le musée au même niveau que les pyramides. En revanche, il sera toujours possible de voir celles-ci depuis des galeries et ses salles, dans un panorama inviolé.",
    question: "Pourquoi Shih-Fu Peng a-t-il été choisi pour construire le musée ?",
    options: ["Il a associé un architecte célèbre à son projet", "Il a cherché à préserver la beauté du site", "Il a conçu un bâtiment qui ressemble aux pyramides", "Il a imaginé un projet qui modifie le paysage"],
    reponseCorrecte: 1, explication: "Shih-Fu Peng a été choisi car son projet évitait de nuire à l'harmonie du plateau de Gizeh en construisant en contrebas — il a cherché à préserver la beauté du site."
  },
  {
    id: 26, niveau: "B2",
    texte: "Fini le poulet-purée !\nRictus inquiet du garçon de salle, regard accusateur des voisins de table... Oser se présenter au restaurant avec un enfant en bas âge déclenche bien souvent la fâcheuse impression d'être persona non grata. Heureusement les choses changent. La clientèle rajeunit et l'univers de la gastronomie se renouvelle. Les grands chefs, dérangés par l'idée d'une cuisine pour enfant, ont pris l'initiative de concocter un menu destiné aux gastronomes en culottes courtes. Comme si ces derniers ne pouvaient apprécier autre chose que du blanc de volaille ou des carottes râpées ! Ils ont préféré adapter la taille des assiettes plutôt que de simplifier leur contenu afin d'éduquer les papilles des bambins.",
    question: "Que font les grands chefs pour les enfants ?",
    options: ["Ils développent leur culture du goût", "Ils leur donnent des cours de cuisine", "Ils leur proposent un plat unique", "Ils limitent la variété de leurs menus"],
    reponseCorrecte: 0, explication: "Les grands chefs adaptent les portions sans simplifier les plats, afin d'« éduquer les papilles des bambins » — ils développent leur culture du goût."
  },
  {
    id: 27, niveau: "B2",
    texte: "Dans une interview, le ministre de l'Écologie proposait ces quelques conseils, mis en pratique par lui-même au quotidien, afin de mieux contribuer au respect de l'environnement : « Ma famille et moi-même avons d'abord installé des économiseurs sur tous les robinets de la maison. D'autre part, nous faisons très attention à ne consommer que des produits de saison afin de réduire au maximum les emballages inutiles que produisent les techniques de congélation et de mise en conserve des aliments. Bref, nous essayons d'appliquer tous ces petits gestes qui doivent devenir de vrais réflexes. »",
    question: "Quelle pratique, entre autres, le ministre de l'Écologie cherche-t-il à limiter ?",
    options: ["La consommation de produits importés par avion", "La distribution de sacs en plastique en magasin", "L'utilisation de métaux toxiques dans les tuyaux", "Le gaspillage de l'eau dans le réseau domestique"],
    reponseCorrecte: 3, explication: "Le ministre mentionne des économiseurs sur les robinets, ce qui vise à limiter le gaspillage de l'eau dans le réseau domestique."
  },
  {
    id: 28, niveau: "B2",
    texte: "Un Français sur quatre renonce à se soigner faute de moyens. Beaucoup d'hôpitaux diminuent leur personnel, et facturent plus cher leurs services aux malades. Le prix des médicaments a doublé en 20 ans. Les inégalités face aux soins s'aggravent. C'est pourquoi nous demandons au gouvernement de mettre en place le remboursement à 100% des dépenses médicales, de faciliter l'installation des jeunes médecins dans les zones qui en manquent, de développer la prévention des maladies et de multiplier les centres médicaux avec des consultations gratuites ! La santé ne peut pas, être un commerce.",
    question: "Qu'est-ce qui indigne l'auteur de cet article ?",
    options: ["La multiplication des pathologies", "L'absence de programme politique", "Le manque de qualité des infrastructures", "L'incompétence du personnel de santé"],
    reponseCorrecte: 1, explication: "L'auteur réclame des mesures gouvernementales inexistantes (remboursement 100%, installation de médecins, prévention) — c'est l'absence de programme politique qui l'indigne."
  },
  {
    id: 29, niveau: "B2",
    texte: "L'émotion des aborigènes. Lorsque les aborigènes Ngarinyin, venus pour la première fois en Europe en 1997 pour une série d'expositions et de conférences sur l'histoire de L'Océanie, entrèrent à Lascaux, ils fondirent en larmes en tombant en arrêt devant les dessins préhistoriques. L'espace d'un instant, ils avaient cru que leur territoire sacré, peint en Australie, les avait suivis jusqu'en France... C'est l'une des anecdotes que raconte l'archéologue Jean-Pierre Mohen dans son livre Art et préhistoire.",
    question: "Pourquoi les aborigènes ont-ils pleuré en voyant les peintures de Lascaux ?",
    options: ["Ils étaient étonnés devant tant de splendeur", "Elles représentaient un lien avec le sacré", "Elles leur rappelaient leur propre histoire", "Elles croyaient voir là leurs propres peintures"],
    reponseCorrecte: 3, explication: "Les aborigènes croyaient reconnaître les peintures de leur territoire sacré australien — ils croyaient voir là leurs propres peintures."
  },
  // --- NIVEAU C1 ---
  {
    id: 30, niveau: "C1",
    texte: "Chaque année, le 10 août, les cordons bleus de l'île de la Guadeloupe se retrouvent à Pointe-à-Pitre pour célébrer saint Laurent, leur patron. Après une grande messe donnée à l'église de Saint-Pierre-et-Saint-Paul, une procession de cuisinières vêtues de leurs plus beaux madras sillonnent la ville avant de convier la population à un grand festin composé des meilleurs plats créoles. Située dans le village du Gosier, à proximité de Pointe-à-Pitre, L'Auberge de la Vielle Tour, construite autour d'un moulin à vent du XVII siècle, sera un lieu de séjour idéal pour assister à cette manifestation haute en couleur et pour goûter au vrai parfum des antilles.",
    question: "La fête de Saint Laurent à Pointe-à-Pitre :",
    options: ["Consiste en un grand événement religieux", "Permet de découvrir les saveurs antillaises", "Se réduit à une manifestation pour touristes", "Se déroule dans un ancien monument restauré"],
    reponseCorrecte: 1, explication: "La fête inclut un grand festin de plats créoles, offrant ainsi la possibilité de découvrir les saveurs antillaises."
  },
  {
    id: 31, niveau: "C1",
    texte: "« Il faut te le dire en quelle langue ? » Cette question, que des milliers de mères posent à leur enfant lorsqu'elles veulent se faire écouter, est en fait très sensée (comme tout ce que disent les mères). Des travaux scientifiques récents ont en effet démontré une réalité étonnante : nous réfléchissons et prenons des décisions différemment lorsque nous traitons l'information dans une autre langue que notre langue maternelle. Nous comprenons tout aussi bien l'idée ou le problème mais, lorsque nous utilisons une autre langue, le résultat est plus réfléchi, moins dicté par les émotions, plus orienté vers l'utilité.",
    question: "Que permet l'utilisation d'une langue autre que la langue maternelle ?",
    options: ["D'attirer l'attention de l'interlocuteur", "D'imaginer des solutions originales", "De solliciter davantage la raison", "De trouver des réponses rapides"],
    reponseCorrecte: 2, explication: "Penser dans une autre langue rend le résultat « plus réfléchi, moins dicté par les émotions », soit solliciter davantage la raison."
  },
  {
    id: 32, niveau: "C1",
    texte: "La Commission européenne s'était penchée sur la demande d'adhésion à l'Union de l'Islande moins de deux semaines après la requête, preuve que le pays possédait des atouts indéniables. Jusqu'alors, l'Islande avait été peu disposée à entrer dans l'Union. Toutefois, suite à l'effondrement de ses principaux établissements financiers et à la chute du cours de la couronne, la monnaie islandaise, le pays avait vu dans cette adhésion et dans l'adoption de l'euro un moyen de stabiliser son économie. Pour le Président de l'Union, cette volonté d'intégrer l'espace européen renforçait la crédibilité du projet communautaire de l'ancien continent. L'Islande avait fini par retirer sa demande suite à un changement de gouvernement et pour éviter des sujets épineux comme les quotas de pêche.",
    question: "Selon cet article, pourquoi l'Islande avait-elle souhaité entrer dans l'Union Européenne ?",
    options: ["Pour bénéficier des aides financières de l'Union", "Pour mieux contrôler ses établissements financiers", "Pour redonner de la valeur à la monnaie nationale", "Pour sortir de la crise que son économie subissait"],
    reponseCorrecte: 3, explication: "Suite à l'effondrement financier et à la chute de la couronne, l'Islande voyait l'adhésion comme un moyen de stabiliser son économie, soit sortir de la crise."
  },
  {
    id: 33, niveau: "C1",
    texte: "En France, entre 200 000 et 500 000 cas de troubles psychiques sont liés au monde du travail. L'apparition de nouvelles méthodes de travail, plus intenses et contraignantes, serait à l'origine de l'augmentation des cas de syndrome d'épuisement professionnel : c'est le mal du siècle et pourtant, il n'est pas encore reconnu. Les salariés, prisonniers de l'idéologie ambiante, s'imaginent trop souvent, quand ils craquent, qu'un collègue plus solide qu'eux aurait été capable de résister. Mais cela s'avère faux la plupart du temps. Une reconnaissance de la maladie obligerait les entreprises à réfléchir à leur fonctionnement et représenterait une réelle mesure d'utilité publique.",
    question: "Quel constat est dressé à propos de ce syndrome ?",
    options: ["Il inquiète les patrons de sociétés.", "Il touche les employés les plus faibles", "Son existence doit être officialisée", "Son traitement est peu efficace"],
    reponseCorrecte: 2, explication: "L'auteur affirme que la reconnaissance officielle de ce syndrome obligerait les entreprises à réagir — son existence doit être officialisée."
  },
  {
    id: 34, niveau: "C1",
    texte: "L'apprentissage en Europe.\nÀ l'heure actuelle, l'utilisation des nouvelles technologies de l'information et de la communication (TIC) dans les salles de classe est rare. Les établissements travaillent encore selon un modèle ancien de l'éducation. Cela signifie que les établissements n'ont pas su se détacher d'une structure trop rigide : ils fondent leurs ressources d'enseignement sur des manuels, ont peu recours aux connaissances mises à leur portée grâce à la mondialisation et travaillent au sein d'espaces d'apprentissage très spécifiques. Les établissements appliquent toujours une philosophie plus caractéristique du XXe siècle (industriel) que du XXIe siècle (informationnel). L'enseignement se caractérise actuellement par des établissements du XIXe siècle dans lesquels des enseignants du XXe siècle travaillent auprès d'étudiants du XXIe siècle.",
    question: "Que présente l'auteur de l'article ?",
    options: ["Des méthodes innovantes sur l'usage des TIC.", "Des pistes de recherche sur l'apprentissage.", "Un état des lieux des ressources pédagogiques.", "Une analyse du contexte socio-éducatif actuel."],
    reponseCorrecte: 3, explication: "L'auteur analyse le fossé entre les systèmes éducatifs actuels et les besoins du XXIe siècle, soit une analyse du contexte socio-éducatif actuel."
  },
  {
    id: 35, niveau: "C1",
    texte: "On connaît Cézanne surtout pour ses paysages, mais le Musée d'Orsay montre, pour la première fois, une partie méconnue de l'œuvre de l'artiste. On y croisera ainsi le visage de son épouse, seul motif autant étudié par le peintre que la montagne Sainte-Victoire. Au fil des versions, Hortense Fiquet devient l'objet d'une recherche plastique, de mise en scène et de géométrisation des formes. Mais Cézanne peut aussi avoir le pinceau cruel. Dès ses débuts, les figures de son père et de sa mère sont tourmentées. Lui-même se représente à 27 ans, patibulaire et le regard injecté de sang. À la fin de sa vie, Cézanne choisit des anonymes du monde rural. Ses tableaux ne sont alors qu'une autre forme de paysage.",
    question: "Que souligne cette exposition sur Paul Cézanne ?",
    options: ["L'influence de ses contemporains", "La singularité de ses portraits", "Son engouement pour la nature", "Son travail post-impressionniste."],
    reponseCorrecte: 1, explication: "L'exposition révèle une facette inconnue : ses portraits, traités avec une recherche plastique et une expressivité unique — la singularité de ses portraits."
  },
  // --- NIVEAU C2 ---
  {
    id: 36, niveau: "C2",
    texte: "Suite à un accident chimique sur un site minier, les pouvoirs publics ont décidé d'obliger les sociétés minières à financer des programmes de recherche et à replanter les surfaces exploitées. Et de fait, les compagnies minières jouent très bien le jeu. Comme il serait bien naïf de penser que leurs dirigeants soient tout à coup devenus philanthropes, il faut chercher la raison de cet intérêt ailleurs. Il se trouve qu'un scientifique, Anthony Van der Hent, a prouvé que des « super-plantes » avaient la faculté d'extraire du sol des métaux économiquement exploitables. C'est donc la possibilité d'allier la régénération de sites industriels à des assurances de gains financiers supplémentaires qui motivent tant les industriels.",
    question: "Sur quel point porte le scepticisme du journaliste ?",
    options: ["La capacité des plantes à nettoyer les sols.", "La rentabilité d'un nouveau système d'extraction.", "Le résultat des recherches de M. Van der Hent", "Les préoccupations écologistes des industriels."],
    reponseCorrecte: 3, explication: "Le journaliste juge « naïf de penser que leurs dirigeants soient devenus philanthropes » — il est sceptique sur les motivations écologistes des industriels."
  },
  {
    id: 37, niveau: "C2",
    texte: "Quand j'ai ouvert ce blog il y a bientôt trois ans, je lisais partout sur internet que le journalisme professionnel était mort dès lors que chacun pouvait devenir journaliste, au sens de diffuseur d'informations. Ce point de vue, à mon sens erroné, tend à disparaître. Il disparaît à mesure que se dessine sur internet la différence entre faits et opinions, entre travail professionnel et amateur, entre capacité à aller chercher l'information et simple possibilité technique de la diffuser. Tout le monde n'est pas devenu journaliste avec internet, en revanche, nous sommes de plus en plus nombreux à accéder au statut de membres actifs du système médiatique.",
    question: "Quelle est l'opinion de cette personne sur l'évolution du métier de journaliste ?",
    options: ["La formation du métier de journaliste est devenue tout à fait inutile", "Une frontière est apparue entre les journalistes confirmés et les autres", "L'évolution d'Internet a affaibli le respect porté au statut de journaliste", "Des internautes publiant sur le net se prennent pour des journalistes"],
    reponseCorrecte: 1, explication: "L'auteur note que la différence entre professionnels et amateurs se dessine de plus en plus clairement — une frontière est apparue entre journalistes confirmés et les autres."
  },
  {
    id: 38, niveau: "C2",
    texte: "C'est au milieu des populations françaises du Canada que s'est développée, au dix-neuvième siècle, la littérature québécoise. Une littérature porte nécessairement l'empreinte de l'esprit qui l'a faite : l'esprit canadien-français est évidemment à base de qualités françaises. Cependant, notre esprit a visiblement subi l'influence des conditions nouvelles de vie, historiques, géographiques et sociales. Bien que pendant deux siècles, les besognes utilitaires aient absorbé toutes nos énergies au dépens de la culture de l'esprit. Aujourd'hui une conscience plus nette de nos déficiences, une ambition plus vive d'accroître notre vie intellectuelle et artistique, un souci plus grand des pouvoirs publics de coopérer avec les initiatives privées ont déterminé des progrès, promesses d'un meilleur avenir.",
    question: "Selon ce spécialiste, qu'est-ce qui caractérise la littérature québécoise contemporaine ?",
    options: ["L'absence d'attirance pour les thèmes traditionnels", "L'affirmation d'un style distinct de celui des français", "L'effervescence créatrice contrastant avec le passé", "Le projet national de produire des œuvres majeures"],
    reponseCorrecte: 3, explication: "L'auteur évoque « un souci plus grand des pouvoirs publics » et une ambition collective pour la vie intellectuelle, soit un projet national de produire des œuvres majeures."
  },
  {
    id: 39, niveau: "C2",
    texte: "Flics d'enfer. Pièce de théâtre. Un face-à-face entre deux flics, deux hommes forts, durs mais tendrement humains, dont les destins vont basculer. Ce qui fait surtout les louanges, ce sont les deux acteurs. La pièce est habituellement bien notée, ne joue jamais les effets racoleurs, n'existe pas vraiment en dehors du jeu des comédiens. Pourtant cette fois, les deux interprètes semblent en dessous de leur réputation.",
    question: "Pour ce journaliste, quel est le point négatif de cette pièce ?",
    options: ["L'intrigue déçoit par son invraisemblance", "La mise en scène est simplifiée à l'extrême", "La tension dramatique demeure inexistante", "Le jeu des comédiens manque de puissance"],
    reponseCorrecte: 3, explication: "Le journaliste note que les interprètes « semblent en dessous de leur réputation », soit que le jeu des comédiens manque de puissance."
  },
];
