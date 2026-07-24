import type { QuestionCE } from "./types";

export const questionsSerie2: QuestionCE[] = [
  // --- NIVEAU A1 ---
  {
    id: 1, niveau: "A1",
    texte: "Vous voulez découvrir d'autres cultures ? vous voulez parler anglais, français, espagnol ?\nLeçons à la maison ou au centre Bernardisilmo.\nInformation au 01 03 02 06 65.",
    question: "Qu'est-ce que propose cette publicité ?",
    options: ["Des cours", "Des emplois", "Des livres", "Des voyages"],
    reponseCorrecte: 0, explication: "La publicité propose des leçons de langues à domicile ou en centre, ce qui correspond à des cours."
  },
  {
    id: 2, niveau: "A1",
    texte: "Faites confiance à l'entreprise pour tous vous envois urgents.\nNous prenons vos paquets à domicile ou dans les bureaux de poste et nous les envoyons dans le monde entier.",
    question: "Que propose cette entreprise ?",
    options: ["De stocker des marchandises", "De transporter des colis", "De vendre des cartons", "De voyager à l'étranger"],
    reponseCorrecte: 1, explication: "L'entreprise propose de prendre les paquets et de les envoyer dans le monde entier, ce qui correspond au transport de colis."
  },
  {
    id: 3, niveau: "A1",
    texte: "Je suis bien arrivé chez moi. Je t'appelle demain pour aller voir le film. Je t'embrasse.\nCristian.",
    question: "Où est Cristian ?",
    options: ["À la gare", "À la maison", "Au cinéma", "Au travail"],
    reponseCorrecte: 1, explication: "Cristian écrit 'Je suis bien arrivé chez moi', ce qui indique qu'il est à la maison."
  },
  {
    id: 4, niveau: "A1",
    texte: "Pierre, n'oubliez pas notre déjeuner au restaurant. Je vous attends devant l'ascenseur.\nAlice.",
    question: "Pourquoi est-ce qu'Alice attend Pierre ?",
    options: ["Pour des courses", "Pour un repas", "Pour un travail", "Pour une réunion"],
    reponseCorrecte: 1, explication: "Alice rappelle à Pierre leur 'déjeuner au restaurant', ce qui correspond à un repas."
  },
  // --- NIVEAU A2 ---
  {
    id: 5, niveau: "A2",
    texte: "François,\nPouvons-nous nous rencontrer dans ton bureau demain matin ?\nAriane.",
    question: "Pourquoi Ariane écrit-elle ce message ?",
    options: ["Elle doit partir une journée", "Elle propose un déjeuner", "Elle souhaite parler à François", "Elle veut visiter une entreprise"],
    reponseCorrecte: 2, explication: "Ariane demande à se rencontrer dans le bureau de François, ce qui signifie qu'elle souhaite lui parler."
  },
  {
    id: 6, niveau: "A2",
    texte: "Le forum de Paris s'adresse aux jeunes de moins de trente ans, avec ou sans diplôme. Des milliers d'offres sont disponibles dans près de 300 métiers. Chaque année, un grand nombre de jeunes signent un contrat de travail lors du salon.",
    question: "Pourquoi le forum de Paris est-il utile aux jeunes ?",
    options: ["Il les renseigne sur des informations", "Il leur permet de trouver un emploi", "Il leur présente des stages en entreprise", "Il leur propose des logements étudiants"],
    reponseCorrecte: 1, explication: "Le texte indique que 'des milliers d'offres sont disponibles' et que 'de nombreux jeunes signent un contrat de travail', ce qui montre que le forum permet de trouver un emploi."
  },
  {
    id: 7, niveau: "A2",
    texte: "Jardin de la Fontaine\nOuverture-Fermeture\nDu 1er septembre au 31 mars 7h30-18h30\nDu 1er avril au 30 juin 7h30-20h30\nDu 1er juillet au 31 août 7h00-22h30",
    question: "Quand peut-on se promener dans le parc après 18h30 ?",
    options: ["En décembre", "En février", "En mai", "En mars"],
    reponseCorrecte: 2, explication: "D'avril à juin, le jardin est ouvert jusqu'à 20h30, ce qui permet de s'y promener après 18h30. Mai est dans cette période."
  },
  {
    id: 8, niveau: "A2",
    texte: "1kg de pommes\nSalade\nMouchoirs en papier",
    question: "Où trouve-t-on ces produits ?",
    options: ["Dans une boucherie", "Dans une boulangerie", "Dans une épicerie", "Dans une poissonnerie"],
    reponseCorrecte: 2, explication: "Les fruits, légumes et produits d'entretien se trouvent dans une épicerie, qui vend des produits alimentaires et ménagers variés."
  },
  {
    id: 9, niveau: "A2",
    texte: "Bonjour Ahmed,\nCe message pour te rappeler la réunion de lundi. Nous commanderons des paniers-repas pour le midi, car la séance peut durer longtemps : les dossiers à traiter sont nombreux. Peux-tu en informer les personnes des services concernés ? Merci d'avance.\nÀ lundi.\nAyoub",
    question: "Que demande Ayoub à Ahmed ?",
    options: ["D'apporter le déjeuner", "D'avancer le rendez-vous", "De consulter les documents", "De prévenir les collègues."],
    reponseCorrecte: 3, explication: "Ayoub demande à Ahmed 'd'en informer les personnes des services concernés', ce qui signifie prévenir les collègues."
  },
  {
    id: 10, niveau: "A2",
    texte: "Madame, Monsieur,\nEn raison de travaux rue Paul Vaillant, l'accès à la piscine municipale se fera côté boulevard Camélinat, du 15 au 26 mars inclus. Veuillez nous excuser pour la gêne occasionnée.\nLe service municipal.",
    question: "Quelle information est donnée au sujet de la piscine ?",
    options: ["Elle sera fermée au mois de mars.", "Il y aura des travaux à l'intérieur.", "L'entrée se fera par une autre porte.", "Le service municipal réparera les lieux."],
    reponseCorrecte: 2, explication: "En raison de travaux sur la rue, l'accès se fera côté boulevard Camélinat, c'est-à-dire par une autre entrée."
  },
  // --- NIVEAU B1 ---
  {
    id: 11, niveau: "B1",
    texte: "Chers amis,\nNous aimerions vous avoir à notre soirée pour fêter la nouvelle année. Soyez là pour 21h00 en tenue décontractée. Nous sommes entre amis.\nCéline et Redah",
    question: "Pourquoi Céline et Redah invitent-ils des amis ?",
    options: ["Pour un anniversaire", "Pour un mariage", "Pour un réveillon", "Pour un spectacle"],
    reponseCorrecte: 2, explication: "L'invitation est pour 'fêter la nouvelle année', ce qui correspond à un réveillon."
  },
  {
    id: 12, niveau: "B1",
    texte: "Clément et Pierre vont participer au tour automobile 4L Trophy au Maroc. Ils vont apporter 40kg de matériel et 10kg de nourriture à une école. Les deux amis recherchent des solutions pour payer leur voyage. Vous voulez les aider ?\nclp@4Ltrophy.fr",
    question: "De quoi ont besoin Clément et Pierre ?",
    options: ["D'argent pour la course", "De livres pour les enfants", "De produits pour les repas", "D'une voiture pour le transport"],
    reponseCorrecte: 0, explication: "Les deux amis 'recherchent des solutions pour payer leur voyage', ce qui signifie qu'ils ont besoin d'argent."
  },
  {
    id: 13, niveau: "B1",
    texte: "Chers collègues,\nVeuillez rendre au plus tard vendredi midi votre feuille de demande de congés. Nous vous rappelons qu'il est essentiel pour le bon fonctionnement de notre société pendant la période estivale et pour satisfaire toutes vos demandes que ces feuilles soient dûment complétées et remises le plus tôt possible à votre responsable. Nous vous remercions de votre collaboration et nous vous souhaitons une bonne semaine.\nLa direction des ressources humaines.",
    question: "Dans ce message électronique, que demande-t-on aux employés ?",
    options: ["De participer à la vie de l'entreprise", "De poser leurs jours de vacances", "De remplir un formulaire en ligne", "De respecter les règles de sécurité"],
    reponseCorrecte: 1, explication: "Le message demande de rendre une 'feuille de demande de congés', ce qui correspond à poser ses jours de vacances."
  },
  {
    id: 14, niveau: "B1",
    texte: "L'Internaute.fr vous informe sur la protection de l'environnement. Chaque année, il envahit vos boîtes aux lettres des tonnes de courriers non adressés dans les boîtes aux lettres de France. Ces courriers sont des publicités de supermarchés ou des journaux gratuits. Il s'avère que la meilleure méthode consiste à poser un autocollant « Stop Pub », disponible gratuitement au titre du ministère de l'Écologie. Cet envoi contient des pages et des sites réels, pour vous inscrire. Robinson pour demande de ne plus recevoir le courrier envoyé par les listes de marketing.",
    question: "Quel est l'objectif de l'article de « L'Internaute.fr » ?",
    options: ["Alerter les clients sur les fausses publicités des magasins", "Donner des conseils pour arrêter de recevoir des publicités", "Présenter le résumé d'une étude sur les effets de la publicité", "Vendre l'autocollant « Stop Pub » du ministère de l'Écologie"],
    reponseCorrecte: 1, explication: "L'article explique comment utiliser un autocollant 'Stop Pub' pour ne plus recevoir de publicités, ce qui correspond à donner des conseils pour arrêter d'en recevoir."
  },
  {
    id: 15, niveau: "B1",
    texte: "Des ingénieurs travaillent très sérieusement à la réalisation d'un bus, semblable à un tramway tunnel qui circulera au-dessus des files de voitures pour dégager le trafic dans les zones urbaines. L'engin sera entièrement électrique et pourra transporter 1200 personnes à une vitesse de 60 km/heure. Pour que les automobilistes « au-dessous » évoluent sans danger, des feux placés dans la partie inférieure du bus signaleront ses changements de direction.",
    question: "Quel sera l'atout de ce moyen de transport ?",
    options: ["Il modifiera son parcours à la demande des usagers", "Il permettra d'éviter les embouteillages en ville", "Il sera équipé d'un nouveau système de sécurité", "Il sera très facile d'entretien et peu coûteux"],
    reponseCorrecte: 1, explication: "Le bus circulera 'au-dessus des files de voitures pour dégager le trafic dans les zones urbaines', ce qui permettra d'éviter les embouteillages."
  },
  {
    id: 16, niveau: "B1",
    texte: "Pas facile de trouver le juste équilibre entre respect et liberté. Le principal du lycée Charles-de-Gaulle a décidé de demander à ses élèves de ne plus porter de vêtements de sport en cours. Le principal estime que c'est une question de respect et de propreté. Un survêtement, ce n'est pas assez habillé pour venir au lycée. Les élèves qui n'étaient pas du même avis n'ont pas été acceptés en cours.",
    question: "Pourquoi la direction de cet établissement interdit-elle la tenue de sport en classe ?",
    options: ["Pour aider les élèves à ne pas s'enrhumer", "Pour enseigner le droit à la tolérance", "Pour respecter des normes d'hygiène", "Pour supprimer les différences sociales"],
    reponseCorrecte: 2, explication: "Le principal estime que le survêtement n'est pas approprié car c'est 'une question de respect et de propreté', ce qui correspond au respect de normes d'hygiène et de tenue."
  },
  {
    id: 17, niveau: "B1",
    texte: "Courir les 42,195 km du marathon de Paris ne s'improvise pas. C'est une course qui nécessite de s'entraîner régulièrement et d'être capable de surmonter le « mur de douleur » qui survient chez tous les marathoniens entre le 32e et le 37e kilomètres. « Pour espérer terminer l'épreuve, il faut courir depuis au moins un an et dans les dernières semaines, faire trois à quatre heures d'entraînement hebdomadaires réparties en autant de séances », insiste un organisateur de stages de préparation.",
    question: "Quel est le conseil de cet organisateur avant de participer au marathon ?",
    options: ["Avoir comme seul objectif de terminer l'épreuve", "Pratiquer la course à pied plusieurs fois par semaine", "Prendre régulièrement des médicaments anti-douleur", "Se donner de longues périodes de récupération"],
    reponseCorrecte: 1, explication: "L'organisateur conseille de 'faire trois à quatre heures d'entraînement hebdomadaires réparties en autant de séances', ce qui correspond à pratiquer la course plusieurs fois par semaine."
  },
  {
    id: 18, niveau: "B1",
    texte: "Pour trouver des personnalités sortant du lot à fort potentiel d'évolution, un cabinet de recrutement organise des entretiens individuels sans consulter au préalable le dossier des candidats. Confrontés à une étude des cas, une discussion d'idées ou un questionnaire croisé, ils peuvent se démarquer grâce à leur savoir-être ou à un talent particulier. Les entretiens n'ont pas pour enjeu de poste précis, ils visent à constituer une réserve de talents, dans laquelle il sera possible de puiser.",
    question: "Quelle est la méthode de recrutement retenue par le cabinet ?",
    options: ["Auditionner plusieurs candidats en même temps.", "Faire mener l'entrevue des candidats par un futur collègue.", "Laisser les candidats s'exprimer sans les interrompre", "Rencontrer les candidats sans rien savoir d'eux"],
    reponseCorrecte: 3, explication: "Le cabinet mène des entretiens 'sans consulter au préalable le dossier des candidats', ce qui signifie rencontrer les candidats sans rien savoir d'eux."
  },
  {
    id: 19, niveau: "B1",
    texte: "Avis de Sonia sur www.village.vacances.fr\nC'était notre première expérience en Villages Vacances. Nous avons découvert un produit complet : hébergement, restauration, activités et services. Des activités sont prévues durant la journée pour les parents et les enfants. Notre petite Mathilde a fait gratuitement de la natation et du cheval !",
    question: "Que proposent les Villages Vacances aux enfants ?",
    options: ["De découvrir la région", "De goûter des spécialités", "De pratiquer un sport", "D'organiser un spectacle"],
    reponseCorrecte: 2, explication: "Le texte mentionne que Mathilde a pu faire 'de la natation et du cheval', ce qui correspond à pratiquer un sport."
  },
  // --- NIVEAU B2 ---
  {
    id: 20, niveau: "B2",
    texte: "Le piment d'Espelette, qui célèbre actuellement sa fête, est probablement aujourd'hui le produit le plus emblématique du Pays basque. Il a pourtant failli devenir un produit banal, c'est-à-dire le contraire absolu de ce qu'il est vraiment. Au début des années 90, on trouvait en effet des producteurs de piment, dit d'Espelette, en Afrique du Nord, en Corse, en Espagne... bref partout où on aime ce goût puissant et peu piquant qui fait sa légitime réputation. Or, les Basques n'aiment pas se faire voler leurs traditions. Ils ont donc obtenu en juin 2000 l'appellation d'origine contrôlée (AOC) interdisant tout plagiat. Aujourd'hui le diamant rouge d'Espelette est particulièrement apprécié de certains grands chefs qui l'utilisent pour faire « exploser » les saveurs.",
    question: "L'appellation d'origine contrôlée accordée au piment d'Espelette permet aux Basques...",
    options: ["De lutter contre les imitations.", "D'en accroître la production.", "De développer sa saveur.", "De le faire davantage connaître."],
    reponseCorrecte: 0, explication: "L'AOC a été obtenue 'interdisant tout plagiat', ce qui permet de lutter contre les imitations du piment d'Espelette."
  },
  {
    id: 21, niveau: "B2",
    texte: "Théo, la poupée « inter-affective ». Théo a deux ans. Il mesure 52 cm et communique spontanément avec sa maman. Lancé par Berchet, ce robot est bourré d'électronique et de capteurs pour interagir avec l'enfant. Ainsi, Théo dort lorsqu'il fait nuit, se réveille au lever du jour, réclame à manger ou à boire et même à aller au pot. Sa voix numérisée est d'un naturel confondant. Surtout, il s'adapte aux capacités de jeux de chaque enfant : plus il manifestera son désir de jouer, plus le jouet sera réactif.",
    question: "La voix numérisée de Théo est d'un « naturel confondant », ce qui signifie qu'elle...",
    options: ["A un timbre qui n'existe pas naturellement", "Se confond avec la voix de l'enfant qui joue", "Enregistre et reproduit les voix entendues", "Imite à la perfection la voix d'un enfant"],
    reponseCorrecte: 3, explication: "L'expression 'd'un naturel confondant' signifie que la voix imite si parfaitement une voix d'enfant qu'il est difficile de la distinguer d'une vraie."
  },
  {
    id: 22, niveau: "B2",
    texte: "Erasmus — Le programme d'échange d'étudiants entre les universités européennes a du plomb dans l'aile. Au point qu'en France près de quatre milles bourses n'ont pas trouvé preneur. Ce phénomène n'est pas spécifique à la France puisqu'une baisse de dix pour cent aurait été enregistrée dans une dizaine de pays. Toutes les études traduisent une absence de désir de mobilité chez les jeunes. Parmi les explications avancées, le coût, mais surtout une préférence marquée pour les stages en entreprise. Voilà le grand concurrent d'Erasmus depuis quelques années : l'attention portée à l'insertion professionnelle.",
    question: "Qu'explique le texte au sujet du programme Erasmus ?",
    options: ["Il est financé par des universités publiques", "Il est remplacé par un autre programme", "Il facilite l'accès au monde de l'entreprise", "Son succès auprès des étudiants se dégrade"],
    reponseCorrecte: 3, explication: "Le texte indique qu'Erasmus 'a du plomb dans l'aile', que des bourses 'n'ont pas trouvé preneur' et qu'une 'absence de désir de mobilité' est constatée, ce qui témoigne d'une dégradation de son succès."
  },
  {
    id: 23, niveau: "B2",
    texte: "Savoir opter pour la bonne route n'est pas tout. L'ultime clé pour gagner la course de la Route du Rhum, c'est la connaissance de soi et tout particulièrement de ses rythmes de sommeil. C'est un des aspects les plus méconnus de la voile de compétition, mais c'est sur la faculté de récupération que peut se jouer le podium. Ainsi, Alain Gautier reconnaît avoir perdu la dernière Route du Rhum parce qu'il n'a pas su, dès les premiers jours de la course, gérer correctement ses phases de repos. « À la fin, j'ai manqué de lucidité et j'ai commis des erreurs », avoue-t-il après sa défaite.",
    question: "Quel conseil donne le journaliste pour remporter la course ?",
    options: ["Connaître ses adversaires", "Cultiver sa concentration", "Dormir efficacement", "Ménager ses efforts"],
    reponseCorrecte: 2, explication: "Le texte insiste sur 'ses rythmes de sommeil' et la 'faculté de récupération' comme clés pour gagner, ce qui correspond à dormir efficacement."
  },
  {
    id: 24, niveau: "B2",
    texte: "Le château de la Bussière est une demeure du 17e siècle située dans le Loiret. Surnommé « le château des pêcheurs », il possède des collections d'objets rares sur la pêche. Sans oublier un superbe parc. Aujourd'hui, ce monument est confronté à un fléau : un champignon ronge ses édifices. Les propriétaires ont déjà lancé une campagne de restauration, mais le champignon s'attaque aussi à d'autres parties du domaine. Les maîtres des lieux souhaitent que le bâtiment retrouve son éclat en sollicitant les internautes. À partir de 15€, les contributeurs pourront recevoir des entrées gratuites, l'inscription de leur nom sur une plaque dans le château ou bien encore un dîner avec les propriétaires.",
    question: "D'après l'article, à quoi les internautes sont-ils encouragés ?",
    options: ["À aider à la rénovation en travaillant au château.", "À entrer en contact avec les occupants du château.", "À financer les travaux du château par un don.", "À visiter le château, ses jardins et expositions."],
    reponseCorrecte: 2, explication: "Les internautes sont invités à contribuer à partir de 15€, ce qui constitue un financement des travaux par un don."
  },
  {
    id: 25, niveau: "B2",
    texte: "Sandrine Mercier et Michel Fonvien ont le voyage dans la peau. Les deux journalistes ont longtemps exploré le monde avant d'écrire un livre ensemble. Ils sont partis vivre ailleurs est constitué des histoires d'une trentaine d'expatriés et d'autant de destins et de trajectoires. Les auteurs sont allés chercher des personnages tous très différents, mais toujours touchants et sincères en racontant leurs parcours lointains : rappel du large, les premiers pas, les déceptions, le rapport à la France, la découverte des autres... c'est certainement ce qui unit tous ces Français du bout du monde ; par-delà leurs différences et leurs expériences : une ouverture d'esprit, une volonté de partager et au final une richesse et une joie de vivre communicative.",
    question: "D'après l'auteur de cet article, quelle est la particularité de cet ouvrage ?",
    options: ["L'originalité des pays visités.", "La description des habitudes quotidiennes.", "La diversité des portraits présentés.", "Les qualités littéraires des écrivains."],
    reponseCorrecte: 2, explication: "L'ouvrage rassemble 'des personnages tous très différents' avec 'autant de destins et de trajectoires', ce qui illustre la diversité des portraits présentés."
  },
  {
    id: 26, niveau: "B2",
    texte: "Longtemps délaissées, les algues semblent peu à peu séduire les consommateurs. En raison de leur confusion avec les algues vertes qui polluent le littoral, ces légumes de mer sont parfois mal considérés. Pourtant, si les algues ne font pas encore partie de notre univers culturel alimentaire, leur consommation est en progression. « Les Occidentaux sont-ils prêts à en faire un produit courant ? » questionne le docteur Arnaud Cacoul. Pas sûr. « Malgré leurs bienfaits nutritionnels, leur consommation restera sans doute limitée » estime ce nutritionniste.",
    question: "Quelle place occupent les algues en France ?",
    options: ["Elles font partie de la gastronomie régionale.", "Les gens en mangent plus que par le passé.", "Les médecins conseillent leur usage en cuisine", "Leur culture augmente rapidement sur les côtes."],
    reponseCorrecte: 1, explication: "Le texte indique que 'leur consommation est en progression', ce qui signifie que les gens en mangent plus qu'auparavant."
  },
  {
    id: 27, niveau: "B2",
    texte: "Depuis plusieurs années, Thierry Marc, un grand chef français, intervient pour donner des cours de cuisine en prison. Faire découvrir à ce public, contraint de vivre en milieu fermé, qu'une profession, quelle qu'elle soit, peut être épanouissante, est une tâche qui le passionne et nécessite très naturellement une grande énergie. Le désir de rallumer cette lueur d'espoir, de montrer « qu'après », il peut y avoir une réinsertion réussie et que chacun la porte en lui, est un moteur pour relever ce défi.",
    question: "Pourquoi Thierry Marc intervient-il dans les prisons ?",
    options: ["Pour améliorer les méthodes de travail de la cantine", "Pour encourager la création de formations professionnelles", "Pour faire naître l'envie de s'investir dans un métier", "Pour sensibiliser le grand public à la réalité de la vie carcérale"],
    reponseCorrecte: 2, explication: "L'objectif est de 'faire découvrir qu'une profession peut être épanouissante' et de 'rallumer une lueur d'espoir' pour une réinsertion réussie, ce qui revient à faire naître l'envie de s'investir dans un métier."
  },
  {
    id: 28, niveau: "B2",
    texte: "L'institution scolaire devra sans cesse être défendue, ne serait-ce que parce que la « société civile » n'aura de cesse de vouloir assujettir l'école à ses demandes particulières. Il faut sans cesse rappeler, par exemple, que les règles de l'école ne sont pas celles de la maison. Car l'enfant n'y est plus seulement un enfant, il y est un élève. À l'école on ne se préoccupe plus du confort et de l'affection pour l'enfant. On s'adresse à l'intelligence de l'élève. Le rapport maître/élève n'est d'ailleurs pas un rapport affectif : on ne demande pas à un professeur d'être sympathique. On lui demande d'être exigeant et juste.",
    question: "Quelle est l'opinion de l'auteur ?",
    options: ["L'ambiance de l'école doit être calquée sur le modèle familial", "L'autorité du professeur doit être compensée par sa gentillesse", "L'épanouissement de l'enfant doit primer sur sa réussite", "L'impartialité doit être l'une des qualités principales d'un maître"],
    reponseCorrecte: 3, explication: "L'auteur précise qu'on demande au professeur 'd'être exigeant et juste', ce qui traduit l'importance de l'impartialité comme qualité principale du maître."
  },
  {
    id: 29, niveau: "B2",
    texte: "Durant les investigations journalistiques, le recours à la caméra cachée est de plus en plus fréquent. Mais souvent, son utilisation n'est aussi qu'un cache-misère, un moyen de compenser l'absence d'informations dans les reportages, de remplir le vide par des scènes un peu spectaculaires. C'est une manière pour certains aussi de faire des économies. Par ailleurs, cette pratique pose une autre question : celle du statut de la personne filmée à son insu. La filmer en caméra cachée, n'est-ce pas supposer qu'elle a quelque chose à se reprocher avant d'avoir commencé à parler ?",
    question: "D'après ce texte, pourquoi les journalistes utilisent-ils des caméras cachées ?",
    options: ["Pour améliorer la qualité des documentaires.", "Pour dissimuler la pauvreté des contenus.", "Pour moderniser leurs méthodes de travail.", "Pour cibler les gens visés par les enquêtes"],
    reponseCorrecte: 1, explication: "Le texte indique que la caméra cachée est souvent 'un cache-misère, un moyen de compenser l'absence d'informations', ce qui revient à dissimuler la pauvreté des contenus."
  },
  // --- NIVEAU C1 ---
  {
    id: 30, niveau: "C1",
    texte: "Trouver un logement dans une ville étudiante est un parcours du combattant pour un grand nombre d'inscrits dans l'enseignement supérieur. La barrière est parfois infranchissable. Non seulement les loyers sont élevés, mais la sélection des candidats par les propriétaires est très dure, souvent basée sur le niveau de revenus des garants. Pour lever ce frein, la caution locative étudiante (CLE) vient d'être généralisée à l'ensemble du territoire national après avoir été expérimentée dans quatre régions pendant un an. Avec ce dispositif, c'est l'État qui se porte garant du versement des loyers des étudiants en cas de non-paiement.",
    question: "Quel est le principal obstacle à l'accès au logement des étudiants selon cette analyse ?",
    options: ["La méfiance des propriétaires", "La rareté des offres de logement.", "L'absence d'engagement de l'État", "Le montant de la caution exigée"],
    reponseCorrecte: 0, explication: "Le texte souligne que 'la sélection des candidats par les propriétaires est très dure', ce qui reflète une méfiance des propriétaires envers les étudiants."
  },
  {
    id: 31, niveau: "C1",
    texte: "Après avoir été fermée au public pendant douze ans, la grotte préhistorique d'Altamira, située en Espagne, doit rouvrir ses portes, mais de manière expérimentale. Il s'agit d'une expérience réservée à un groupe de cinq personnes tirées au hasard parmi les visiteurs du musée du site, qui vont pouvoir contempler les peintures rupestres originales. Cette expérience se déroulera une fois par semaine pendant huit mois afin de permettre à une équipe de scientifiques d'évaluer l'impact des visites sur l'ensemble du site et de donner son avis sur une réouverture complète.",
    question: "Qu'évoque-t-on dans cet article ?",
    options: ["L'inauguration d'une exposition temporaire", "L'inscription d'une œuvre au patrimoine mondial", "L'ouverture au public d'une zone dangereuse", "L'accès réglementé à un emplacement protégé"],
    reponseCorrecte: 3, explication: "L'accès à la grotte est limité à cinq personnes tirées au sort, une fois par semaine, sous contrôle scientifique, ce qui constitue un accès réglementé à un site protégé."
  },
  {
    id: 32, niveau: "C1",
    texte: "Pas de clash ni de portes qui claquent. À l'issue de la deuxième conférence sociale, le gouvernement peut au moins se réjouir de ce résultat. Les représentants du patronat et des syndicats n'ont pas applaudi à tout rompre l'intervention du premier ministre, mais il n'y avait pas non plus eu de fâcherie. Si certains se sont dits déçus par la minceur des annonces que le premier ministre a dévoilées ou par les zones de flou qui règnent sur plusieurs dossiers brûlants — les retraites en tête — personne n'a non plus eu vent de colères. Il faut dire que pendant deux jours, ministres et conseillers se sont échiné à repousser les points qui fâchent à plus tard.",
    question: "Quel a été l'aboutissement de la conférence ?",
    options: ["L'affrontement entre partenaires sociaux", "L'avancée majeure en termes de fiscalité", "La proclamation de réformes importantes", "L'absence de prise de décisions effectives"],
    reponseCorrecte: 3, explication: "Les annonces sont 'minces', les dossiers brûlants sont reportés 'à plus tard', et il n'y a pas eu de décisions concrètes, ce qui traduit une absence de prise de décisions effectives."
  },
  {
    id: 33, niveau: "C1",
    texte: "« Des taxes vertes » ou taxes carbone sont envisagées pour faire face aux financements nécessaires d'énergies non polluantes. Les mécanismes prévus dans le protocole de Kyoto concernent notamment un crédit carbone qui représente un volume d'émission de gaz à effet de serre (GES) évité et des permis d'émission négociables. Le crédit carbone est doté d'une valeur marchande et s'échange entre pays industrialisés. Un pays n'arrivant pas à atteindre son objectif de réduction des GES pourrait acheter des crédits carbone à un autre qui aurait dépassé son objectif. Ce système a été parfois qualifié de permis à polluer, car un pays riche pourrait acheter le droit de polluer à un autre ayant réellement réduit ses émissions.",
    question: "Quel est le paradoxe de la taxe carbone ?",
    options: ["Elle concerne uniquement les économies fortes", "Elle freine l'utilisation de ressources renouvelables", "Elle permet le dépassement des normes édictées", "Elle ralentit le progrès dans les états émergents"],
    reponseCorrecte: 2, explication: "Le système permet à un pays riche d'acheter le droit de polluer, ce qui constitue un paradoxe : une taxe censée réduire la pollution peut en réalité permettre de dépasser les normes fixées."
  },
  {
    id: 34, niveau: "C1",
    texte: "Quel visage Paris pourrait-il prendre en 2100 ? C'est ce que le collectif d'architectes « Et alors » a imaginé au travers de vingt cartes postales géantes, exposées à Paris. Ce qui donne un résultat surprenant, parfois utopique, parfois réaliste. Ainsi l'idée d'une centrale hydrothermique pour chauffer et refroidir tout un quartier, projet de la compagnie parisienne du chauffage urbain. Des potagers « partagés » au pied des immeubles en plein centre-ville, cela ressemble plus à un clin d'œil malicieux... le vélo a également la part belle : les architectes imaginent des voies rapides sur les toits de Paris, au milieu de toitures végétalisées et de jardins.",
    question: "Quel projet est présenté comme réaliste ?",
    options: ["L'extension d'un système de climatisation à tout un quartier", "L'installation des parcs sur les toits des bâtiments parisiens", "La construction de pistes cyclables au sommet des immeubles", "La création de jardins communs pour planter des légumes"],
    reponseCorrecte: 0, explication: "La centrale hydrothermique est qualifiée de 'réaliste' car c'est un projet de la compagnie parisienne du chauffage urbain, contrairement aux autres idées décrites comme utopiques ou malicieuses."
  },
  {
    id: 35, niveau: "C1",
    texte: "Il faut se rendre à l'évidence : le « jour » n'est plus l'unité de temps d'un journal. Un quotidien papier ne peut pas rivaliser avec la vitesse à laquelle les sites, les blogs, les réseaux sociaux, les journaux en ligne, les radios et télés, les « news » des grands serveurs diffusent les nouvelles du jour. Aussi, au moment où il est en kiosques, se condamne-t-il à apparaître comme « le journal de la veille », perdant progressivement ses lecteurs qui, bombardés de scoops tous azimuts, sont déçus de n'y trouver que ce qu'ils savaient déjà.",
    question: "Quelle est la position de l'auteur de l'article ?",
    options: ["Il conteste la fiabilité des sources d'internet.", "Il critique la surabondance de l'information.", "Il dénonce la médiocrité de la presse écrite.", "Il doute de l'intérêt des médias traditionnels."],
    reponseCorrecte: 3, explication: "L'auteur montre que le journal papier ne peut plus rivaliser avec les médias numériques et qu'il apparaît comme 'le journal de la veille', ce qui exprime un doute sur l'intérêt des médias traditionnels."
  },
  // --- NIVEAU C2 ---
  {
    id: 36, niveau: "C2",
    texte: "Un vingt-sixième album de Françoise Hardy. La pluie sans parapluie est forcément un événement. On sait que le public qui achète encore des disques passe volontiers à la caisse, pour montrer sa fidélité, ou simplement son envie de vibrer avec cette voix unique et si familière avec laquelle elle semble d'ailleurs plus en confiance que jamais. Elle module, appuie, interprète, joue avec souplesse de son phrasé, alors que les aficionados se contenteraient juste de ce grain unique et révéré. C'est un album pour ceux qui ont le temps, qui ne consomment pas la musique en tant qu'application sonore de la vie actuelle. Il faut se retrancher pour en saisir la saveur et la goûter. Un disque comme autrefois, avec un soin de l'émotion. Mais surtout une élégance comme on n'en fait plus !",
    question: "Selon le journaliste, quel type de public pourrait s'intéresser au dernier album de F. Hardy ?",
    options: ["Les acheteurs opposés au téléchargement illégal", "Les amateurs de subtilité et de raffinement musical", "Les admirateurs inconditionnels de l'interprète", "Les curieux en mal de musique expérimentale"],
    reponseCorrecte: 1, explication: "L'album est décrit comme nécessitant du temps et une écoute attentive ('Il faut se retrancher pour en saisir la saveur'), et comme une œuvre d'élégance, ce qui attire les amateurs de subtilité et de raffinement musical."
  },
  {
    id: 37, niveau: "C2",
    texte: "Dans leur nouvelle collection, les éditions Nil invitent des auteurs à se livrer à un exercice épistolaire intime en écrivant une lettre pour dire l'indicible. Le modèle est celle que Kafka rédigea à l'intention de son père et qu'il préféra ranger dans un tiroir tant l'accusation portée était peu amène. Avec L'autre fille, missive adressée à sa sœur aînée, morte avant sa naissance, Annie Ernaux inaugure brillamment le concept, fidèle à son écriture tranchante et analytique. Rejetant le terme d'autofiction, l'écrivain se dit fasciné par la réalité, partant à la recherche d'une vérité sur une mort que ses parents lui ont toujours cachée. En demandant à des auteurs de se libérer d'un vieux sentiment, la collection souhaite réhabiliter un genre littéraire oublié.",
    question: "À quel résultat la participation à cette collection conduit-elle Annie Ernaux ?",
    options: ["À s'acquitter d'un engagement moral", "À s'affranchir d'une histoire ancienne", "À se défaire d'un sentiment de culpabilité", "À se justifier d'une action peu glorieuse"],
    reponseCorrecte: 1, explication: "Annie Ernaux part 'à la recherche d'une vérité sur une mort que ses parents lui ont toujours cachée', ce qui correspond à se libérer d'une histoire ancienne qui lui était inconnue."
  },
  {
    id: 38, niveau: "C2",
    texte: "Les méfiances à l'égard de la gratuité des transports collectifs demeurent fortes. Sans surprise, l'Union des transports publics affiche son hostilité. Trop onéreuse, ne facilitant pas le report de la voiture vers les transports collectifs, menaçant la qualité de service, la gratuité pour tous ne répondrait pas aux objectifs de développement d'un réseau de transport. Selon l'UTP, la gratuité est une « fausse bonne idée » qui « induit des déplacements inutiles, encourage l'étalement urbain et prive de ressources le système de transport au moment où la clientèle augmente et où les recettes fiscales des collectivités diminuent ». Elle lui préfère le système de tarification spéciale pour les jeunes, les sans-emplois ou les familles nombreuses.",
    question: "Pourquoi la gratuité des transports publics est-elle critiquée ?",
    options: ["Ce choix creuse les inégalités sociales", "Ce projet omet des questions de sécurité", "Cette démarche déresponsabilise les usagers", "Cette initiative coûte beaucoup trop cher"],
    reponseCorrecte: 3, explication: "La gratuité est décrite comme 'trop onéreuse' et 'prive de ressources le système de transport', ce qui signifie qu'elle coûte trop cher à mettre en place et à maintenir."
  },
  {
    id: 39, niveau: "C2",
    texte: "Depuis l'adolescence, je fréquente assidûment les dictionnaires. Chaque fois que je bute sur un mot, que je suis dans le flou culturel, ils m'apportent la réponse et ouvrent de nouveaux horizons à ma curiosité en me renvoyant souvent à d'autres ouvrages. Je possède une certaine quantité de dictionnaires et chacun est une bibliothèque à lui seul. Tous sont autant de béquilles de ma culture. Par exemple, quand vous cherchez le mot juste, rien de tel qu'un dictionnaire des synonymes ! On ouvre un dictionnaire pour se renseigner sur une question précise comme on lit la notice d'un produit pharmaceutique destiné à soigner ceci ou cela : c'est le self-service de la pensée.",
    question: "Pourquoi Jean Claude aime-t-il les dictionnaires ?",
    options: ["Pour découvrir de nouvelles références", "Pour posséder une bibliothèque fournie", "Pour s'évader vers des horizons lointains", "Pour trouver des remèdes à ses maux"],
    reponseCorrecte: 0, explication: "Les dictionnaires 'ouvrent de nouveaux horizons à ma curiosité en me renvoyant souvent à d'autres ouvrages', ce qui correspond à la découverte de nouvelles références."
  }
];
