import type { QuestionCE } from "./types";


export const questionsSerie12: QuestionCE[] = [

{
  id: 1, niveau: "A1",
  texte: "INFIRMERIE\nJe suis en consultation. Revenez dans quelques minutes.",
  question: "Que faire pour rencontrer l'infirmière ?",
  options: ["Frapper et entrer.", "Prendre rendez-vous.", "Revenir plus tard.", "Téléphoner."],
  reponseCorrecte: 2,
  explication: "La pancarte indique que l'infirmière est en consultation et demande de revenir dans quelques minutes, donc il faut revenir plus tard."
},
{
  id: 2, niveau: "A1",
  texte: "ÉTUDIANTS INTERNATIONAUX : NE RESTEZ PAS SEULS !\nInscrivez-vous dans l'association de l'Université pour :\n• discuter avec des étudiants français ;\n• participer à des groupes de conversation ;\n• faire des activités ensemble : sport, shopping, visite, sorties...\nET TOUT EST GRATUIT !",
  question: "Que propose cette association ?",
  options: ["Des cours particuliers.", "Des jobs pendant le week-end.", "Des rencontres entre jeunes.", "Des voyages à l'étranger."],
  reponseCorrecte: 2,
  explication: "L'association propose de discuter avec des étudiants français, de participer à des groupes de conversation et de faire des activités ensemble, ce qui correspond à des rencontres entre jeunes."
},
{
  id: 3, niveau: "A1",
  texte: "Désolé de te le dire si tard ! Je ne peux pas venir ce soir.\nPierre",
  question: "Pourquoi Pierre a-t-il écrit ce message ?",
  options: ["Il annonce son absence.", "Il donne un rendez-vous.", "Il indique son arrivée.", "Il signale son retard."],
  reponseCorrecte: 0,
  explication: "Pierre écrit pour prévenir qu'il ne peut pas venir ce soir, il annonce donc son absence."
},
{
  id: 4, niveau: "A1",
  texte: "Musique jazz et brésilienne durant tout l'été dans le quartier du Musée d'Art Moderne !\nChaque jeudi et vendredi de 17 h à 19 h, profitez d'un été musical sur les nombreuses terrasses de notre beau quartier.",
  question: "Qu'est-ce qu'on peut faire dans ce quartier ?",
  options: ["Apprendre à jouer d'un instrument.", "Assister à des concerts.", "Réserver des billets de spectacle.", "S'inscrire à des animations."],
  reponseCorrecte: 1,
  explication: "L'affiche annonce des concerts de jazz et de musique brésilienne sur les terrasses du quartier chaque jeudi et vendredi."
},
{
  id: 5, niveau: "A2",
  texte: "Françoise,\nPouvons-nous nous rencontrer dans ton bureau demain matin ?\nAriane.",
  question: "Pourquoi Ariane écrit-elle ce message ?",
  options: ["Elle doit partir une journée.", "Elle propose un déjeuner.", "Elle souhaite parler à Françoise.", "Elle veut visiter une entreprise."],
  reponseCorrecte: 2,
  explication: "Ariane demande à Françoise de se rencontrer dans son bureau, elle souhaite donc lui parler en tête-à-tête."
},
{
  id: 6, niveau: "A2",
  texte: "Salut Samira.\nLa fête du cinéma commence samedi prochain, ça t'intéresse ? Viens chez moi après le travail vendredi, on choisira ce qu'on ira voir samedi ou dimanche. Réponds-moi vite !\nLali",
  question: "Que veut faire Lali ?",
  options: ["Aller à un anniversaire.", "Dîner avec son amie.", "Partir en week-end.", "Regarder des films."],
  reponseCorrecte: 3,
  explication: "Lali invite Samira à profiter de la fête du cinéma pour aller voir des films ensemble le week-end."
},
{
  id: 7, niveau: "A2",
  texte: "À l'attention des élèves de 5e B\nLe cours de mathématiques aura exceptionnellement lieu à 15 heures ce jour, dans la salle habituelle. Merci de votre compréhension.\nLe professeur, M. Valmont",
  question: "Pourquoi M. Valmont a-t-il écrit ce message ?",
  options: ["Pour annoncer un changement.", "Pour inviter les élèves à une réunion.", "Pour modifier l'horaire d'un cours.", "Pour remercier les élèves de 5e B."],
  reponseCorrecte: 2,
  explication: "M. Valmont informe ses élèves que le cours de mathématiques aura exceptionnellement lieu à 15h, modifiant ainsi l'horaire habituel."
},
{
  id: 8, niveau: "A2",
  texte: "Vous voulez rire ?\nDécouvrez Mimiquette et Théophilou, des personnages de bande dessinée que tous les petits adorent parce qu'ils sont gais, aiment inventer des jeux et mettent souvent leurs parents en colère : comme tous les enfants !",
  question: "Comment sont les personnages de Mimiquette et Théophilou ?",
  options: ["Beaux.", "Calmes.", "Courageux.", "Joyeux."],
  reponseCorrecte: 3,
  explication: "Le texte décrit les personnages comme 'gais' et aimant inventer des jeux, ce qui correspond à des personnages joyeux."
},
{
  id: 9, niveau: "A2",
  texte: "ATTENTION\nDate limite des demandes de congés pour les vacances d'été : les faire parvenir à Mme Létourneau, bureau du personnel, 2e étage, avant le 20 avril, dernier délai.\nLe Bureau du personnel.",
  question: "À qui s'adresse ce message ?",
  options: ["À des clients.", "À madame Létourneau.", "À des élèves.", "À des employés."],
  reponseCorrecte: 3,
  explication: "Le message concerne des demandes de congés à soumettre au bureau du personnel, il s'adresse donc aux employés d'une entreprise."
},
{
  id: 10, niveau: "A2",
  texte: "Chers collègues,\nNous vous informons que la réunion parents-professeurs des classes de seconde prévue pour ce samedi est reportée au samedi prochain à midi. Votre présence est obligatoire.\nLa direction du lycée",
  question: "À qui est adressé ce message ?",
  options: ["Aux élèves.", "Aux étudiants.", "Aux parents.", "Aux professeurs."],
  reponseCorrecte: 3,
  explication: "Le message commence par 'Chers collègues' et est envoyé par la direction du lycée, il s'adresse donc aux professeurs."
},
{
  id: 11, niveau: "B1",
  texte: "Nous sommes tous, peu ou prou, sujets au trac. C'est une réaction à la fois physique et mentale, une paralysie qui nous saisit sans nous prévenir. Le trac n'est autre que le résultat de notre désir de bien faire, mais il est possible de le surmonter. Inutile d'absorber des substances plus ou moins efficaces. Il suffit de bien respirer, de visualiser la scène idéale et de se reposer avant l'épreuve.",
  question: "Selon cet article, est-il possible de lutter contre le trac ?",
  options: ["Non, parce que c'est une réaction normale.", "Bien sûr ! il existe des médicaments très efficaces.", "Oui, grâce à des méthodes très simples.", "Certainement pas. Il est insurmontable."],
  reponseCorrecte: 2,
  explication: "L'article indique qu'il suffit de bien respirer, de visualiser la scène idéale et de se reposer, ce sont des méthodes simples et naturelles pour surmonter le trac."
},
{
  id: 12, niveau: "B1",
  texte: "Les petits Allemands ont de la chance. Depuis quelques années, leurs établissements, de la maternelle au lycée, ont de nouvelles chaises aux formes arrondies et colorées. Ces chaises, pensées pour les besoins des écoliers, répondent à une nouvelle philosophie de l'enseignement. Avant il fallait rester immobile et écouter. Aujourd'hui les psychologues pensent qu'il faut laisser les écoliers bouger, en particulier les très jeunes enfants, car le mouvement aide à la concentration. Il renforce également la construction musculaire.",
  question: "Pourquoi a-t-il-on remplacé le mobilier des écoles allemandes ?",
  options: ["Pour accueillir des élèves handicapés.", "Pour favoriser une autre pédagogie.", "Pour limiter les problèmes de santé.", "Pour rénover les salles de classe."],
  reponseCorrecte: 1,
  explication: "Le texte explique que ces nouvelles chaises répondent à une nouvelle philosophie de l'enseignement qui encourage le mouvement pour aider à la concentration, soit une autre approche pédagogique."
},
{
  id: 13, niveau: "B1",
  texte: "Madame Pierre,\nNous avons bien reçu votre demande de documentation concernant nos services de téléphonie.\nUn conseiller prendra contact avec vous très prochainement au numéro de téléphone que vous nous avez communiqué. Nous vous remercions de votre confiance.\nCordialement,\nService clients, PX",
  question: "Pourquoi Madame Pierre a-t-elle contacté la société PX ?",
  options: ["Elle demande un remboursement.", "Elle doit prendre un rendez-vous.", "Elle souhaite des renseignements.", "Elle veut faire une réclamation."],
  reponseCorrecte: 2,
  explication: "La réponse de la société PX confirme avoir reçu une demande de documentation concernant leurs services de téléphonie, donc Madame Pierre cherchait des renseignements."
},
{
  id: 14, niveau: "B1",
  texte: "Location temporaire. Chambre individuelle de 20 m² dans un appartement de 65 m² proche de Paris. Meublé tout confort (lave-linge, lave-vaisselle, écran plat/DVD). Colocation pour l'été du 1er juillet au 31 août seulement. Quartier calme et transports à proximité (métro, bus, RER). 550 € toutes charges comprises (eau, électricité, chauffage, internet). Personne sérieuse et garanties demandées !\nContacter Julie au 06 76 34 39 01.",
  question: "Que veut Julie ?",
  options: ["Échanger son appartement pendant l'été.", "Louer un appartement meublé de m².", "Partager son appartement pour deux mois.", "Vendre son appartement près de Paris."],
  reponseCorrecte: 2,
  explication: "Julie propose une colocation temporaire du 1er juillet au 31 août dans son appartement, soit deux mois de partage de logement."
},
{
  id: 15, niveau: "B1",
  texte: "Cher confrère,\nCi-joint notre catalogue de boissons pour cette année. En espérant que vous pourrez satisfaire votre clientèle, nous vous remercions pour vos futurs achats.\nAvec nos salutations les plus cordiales,\nEntreprise Labayle et Chandon.",
  question: "Quel est l'objet de ce courrier ?",
  options: ["Demander des informations sur des produits.", "Passer une commande de produits.", "Présenter de nouveaux produits.", "Proposer une dégustation de produit."],
  reponseCorrecte: 2,
  explication: "L'entreprise envoie son catalogue de boissons pour l'année en cours, ce qui correspond à une présentation de leurs produits à un client professionnel."
},
{
  id: 16, niveau: "B1",
  texte: "Les termes «intelligence artificielle» entraînent généralement des inquiétudes. Pourtant, une étude menée auprès de 14.078 salariés, dans onze pays différents et dans plusieurs secteurs d'activités (santé, transports, énergie...), tente de prouver que l'intelligence artificielle pourrait augmenter de 10 %, en moyenne les effectifs des entreprises ayant investi dans cette technologie. De plus, elle donnerait lieu à un changement radical de modèle et ouvrirait la possibilité pour les entreprises d'inventer des services et de s'ouvrir à de nouvelles opportunités.\nD'après lefigaro.fr",
  question: "Selon cet article, quelle est l'une des possibilités offertes par l'intelligence artificielle ?",
  options: ["Baisser les salaires.", "Créer des emplois.", "Diviser le travail.", "Favoriser la recherche."],
  reponseCorrecte: 1,
  explication: "L'étude citée montre que l'IA pourrait augmenter de 10% les effectifs des entreprises, ce qui correspond à une création d'emplois."
},
{
  id: 17, niveau: "B1",
  texte: "Job d'été, la première expérience\nQuand une entreprise fait appel pour la première fois à un jeune, elle n'a pas d'attente vis-à-vis de ses compétences professionnelles, c'est donc sur son comportement que vont se porter ses critères d'évaluation. Même saisonnier, il faut montrer qu'on a vraiment envie de décrocher un job. Les jeunes sans expérience ont tout intérêt à parler de leur passion et à démontrer leur motivation. Pour un employeur, c'est ce qui reste souvent le critère le plus important.",
  question: "Selon l'article, que faut-il faire pour trouver un job d'été ?",
  options: ["Exposer l'ensemble de ses qualités professionnelles.", "Faire la preuve de son désir de travailler.", "Parler avec enthousiasme de ses projets de formation.", "Parler des emplois qu'on a déjà occupés."],
  reponseCorrecte: 1,
  explication: "L'article insiste sur le fait que la motivation est le critère le plus important pour un employeur face à un jeune sans expérience : il faut montrer son envie de travailler."
},
{
  id: 18, niveau: "B1",
  texte: "Parents mode d'emploi\nSérie télévisée – Du lundi au vendredi à 20h40\nNous découvrons le quotidien de Gaby et Isa, les personnages principaux, quadragénaires d'aujourd'hui, qui cherchent un mode d'emploi pour être de bons parents ! Ils essaient de contrôler la situation et seraient même prêts à nous donner des conseils, mais comme tous les parents, ils font de grosses erreurs… ce qui nous amuse et nous fait rire, pour notre plus grand plaisir !",
  question: "Quel est l'objectif de cette série télévisée ?",
  options: ["Informer sur de nouvelles méthodes éducatives.", "Montrer la vie de tous les jours d'un jeune couple.", "Présenter les relations familiales avec humour.", "Proposer des solutions à des situations de crise."],
  reponseCorrecte: 2,
  explication: "La série montre des parents qui font des erreurs dans leur rôle, ce qui amuse et fait rire le public, soit une présentation des relations familiales avec humour."
},
{
  id: 19, niveau: "B1",
  texte: "LA NÉO-RURALITÉ EST DEVENUE UN PHÉNOMENE DE SOCIÉTÉ.\nCette dénomination date des années 70 : c'est « le retour à la terre ». Alors que la désertification des campagnes se poursuit, un mouvement de population inverse s'opère. Il concerne des personnes jeunes, sans enfant, portant les valeurs contestataires de mai 68. Issues de toutes les classes sociales, elles ne recherchent pas spécialement le confort. Elles veulent avant tout vivre une expérience, ce qui les différencie de la population locale et ne facilite pas leur intégration.",
  question: "Que veulent les néo-ruraux ?",
  options: ["Accéder à la propriété privée.", "Avoir un mode de vie économique.", "Participer à la vie associative.", "Tenter une nouvelle aventure."],
  reponseCorrecte: 3,
  explication: "Le texte précise que les néo-ruraux veulent avant tout vivre une expérience, ce qui correspond à tenter une nouvelle aventure en quittant la ville pour la campagne."
},
{
  id: 20, niveau: "B2",
  texte: "Pour lutter efficacement contre le changement climatique, il est essentiel de trouver des réponses technologiques à notre consommation d'énergie. Néanmoins, il est également nécessaire de concilier mesures environnementales et activités économiques. Si nous ne respectons pas ce point, nous n'atteindrons pas nos objectifs. Ainsi, le futur Plan Climat devra être mis en place en concertation avec les habitants mais également avec les entreprises implantées dans la région, afin que chacun ait un objectif à atteindre dans la lutte contre le changement climatique.",
  question: "Que faudrait-il faire pour lutter efficacement contre le changement climatique ?",
  options: ["Moderniser les installations anti-pollution.", "Modifier les circuits de production.", "Organiser des formations sur le sujet.", "Responsabiliser les acteurs concernés."],
  reponseCorrecte: 3,
  explication: "Le texte insiste sur la nécessité d'impliquer habitants et entreprises afin que chacun ait un objectif à atteindre, ce qui revient à responsabiliser tous les acteurs concernés."
},
{
  id: 21, niveau: "B2",
  texte: "Le CENTQUATRE a ouvert ses portes\nSamedi dernier, voisins et passants, artistes et curieux, professionnels et amateurs, ont été invités à pénétrer dans le nouvel établissement artistique de la ville de Paris : le CENTQUATRE. Ce lieu de résidence et de création artistiques, unique au monde, s'étend sur près de 40 000 m² entre le 104 rue d'Aubervilliers et le 5, rue Curial à Paris (19°).",
  question: "D'après cette annonce, à quoi sert le « CENTQUATRE » ?",
  options: ["À accueillir des artistes ainsi que leurs œuvres.", "À exposer des collections permanentes d'art moderne.", "À former des artistes amateurs de la ville de Paris.", "À organiser des événements pour les habitants du quartier."],
  reponseCorrecte: 0,
  explication: "Le texte décrit le CENTQUATRE comme un lieu de résidence et de création artistiques qui a invité artistes et curieux à le découvrir, son rôle principal étant donc d'accueillir des artistes ainsi que leurs œuvres."
},
{
  id: 22, niveau: "B2",
  texte: "Dans un monde rationnel, l'innovation technologies devrait découler d'un besoin et y apporter une solution. Depuis quelques décennies, nous observons l'inverse, aussi bien dans le monde professionnel que dans celui de la vie privée. Nous nous voyons proposer un nouveau type de produit à la technologie révolutionnaire, nous lui trouvons avec jubilation une place dans notre vie, puis nous en devenons souvent prisonniers. De cette manière, ce que nous appelons le progrès devient incontrôlable et nous en devenons les suiveurs inconscients. Mon propos n'est certainement pas de condamner ni le progrès ni la consommation, mais de faire un plaidoyer pour que nous en soyons les maîtres et non les esclaves.",
  question: "Quelle est l'idée de ce texte ?",
  options: ["Le progrès passe par les nouvelles technologies.", "L'attrait de la nouveauté est incontournable.", "L'homme se laisse dominer par la technologie.", "La technologie est le reflet de la modernité."],
  reponseCorrecte: 2,
  explication: "L'auteur décrit comment les humains adoptent des technologies sans en avoir besoin au départ, puis en deviennent prisonniers et suiveurs inconscients, illustrant que l'homme se laisse dominer par la technologie."
},
{
  id: 23, niveau: "B2",
  texte: "Madame,\nJe vous remercie pour les fiches de lecture que vous m'avez envoyées pour enrichir ma thèse. À première vue, elles viennent à point appuyer le concept de ma troisième partie. Cependant, des événements d'ordre privé ayant perturbé mon emploi du temps, je ne serai pas en mesure d'achever mes lectures avant notre prochain rendez-vous. Dans ces conditions, je pense qu'il est préférable de le reporter. Je vous demande de bien vouloir m'excuser pour ce contretemps. J'espère reprendre contact avec vous très prochainement pour enfin pouvoir échanger avec vous mes impressions sur ces lectures.\nCordialement,\nGéraldine Dupont",
  question: "Qu'annonce Géraldine dans son message ?",
  options: ["L'envoi d'un bilan de ses lectures.", "La fin des modifications sur sa thèse.", "Le retard pris dans ses recherches.", "La date de leur prochaine rencontre."],
  reponseCorrecte: 2,
  explication: "Géraldine explique que des événements personnels l'ont empêchée d'achever ses lectures et qu'elle ne pourra pas être prête pour le rendez-vous prévu, annonçant ainsi un retard dans ses recherches."
},
{
  id: 24, niveau: "B2",
  texte: "Il change le clavier de ses deux ordinateurs tous les six mois. Les touches cèdent sous ses mains qui, telles des araignées possédées, tissent roman après roman. En vingt ans, il a écrit près de mille cent titres. C'est un touche-à-tout : il pond aussi bien de la littérature pour herboristes que de la pharmacopée policière. Cet ancien chirurgien a abandonné le festin sanglant des blocs opératoires pour les joies de la graphomanie. « Je me suis lassé de la médecine. Mais j'écris mes romans avec toute la passion que j'avais pour la chirurgie », explique-t-il.",
  question: "Quelle est la particularité de cet écrivain ?",
  options: ["Il a écrit une œuvre abondante et variée.", "Il a toujours rêvé de devenir médecin.", "Il est emballé par les histoires d'épouvante.", "Il peine à écrire depuis quelques temps."],
  reponseCorrecte: 0,
  explication: "En vingt ans, l'écrivain a produit près de 1100 titres dans des genres très variés (littérature pour herboristes, policier...), ce qui constitue une œuvre à la fois abondante et variée."
},
{
  id: 25, niveau: "B2",
  texte: "Le sport est avant tout un loisir et doit le rester. Pour chacun, quelle que soit sa pratique. Pour que celle-ci reste toujours agréable, une règle de base : se préparer. Avant tout, assurez-vous que vous êtes apte à faire du sport. Les interdictions sont essentiellement liées à l'âge ou à des pathologies préexistantes. L'entraînement doit être régulier. Il faut progresser lentement dans la durée et dans l'intensité. C'est la meilleure garantie pour ne pas souffrir en faisant du sport, à condition aussi de savoir s'échauffer avant chaque séance. Il va sans dire que le matériel doit être bien adapté à votre taille et à votre niveau sportif.",
  question: "Quel titre convient le mieux à cet article ?",
  options: ["Les sports à risque.", "Le sport sans douleur.", "Les dangers du sport.", "Les bienfaits du sport."],
  reponseCorrecte: 1,
  explication: "L'article donne des conseils pour pratiquer le sport sans souffrir (préparation, progression lente, échauffement, matériel adapté), ce qui correspond au titre « Le sport sans douleur »."
},
{
  id: 26, niveau: "B2",
  texte: "Journée « Portes Ouvertes » à Polytech'Tours.\nVenez rencontrer les étudiants, enseignants et associations de Polytech'Tours\nLe samedi 12 février, de 9h à 16h sans interruption\n→ Espaces d'information présents sur les trois sites de l'école.\n→ Présentation des études et des métiers d'ingénieur par les responsables des spécialités sur chaque site.\n→ Visites guidées des salles de travaux pratiques, des centres de documentation, des laboratoires de recherche et de langues.\n→ Démonstration des projets réalisés dans nos cursus.\n→ Présentation des associations étudiantes.",
  question: "Quel est l'objectif de cette journée ?",
  options: ["Découvrir le travail de recherche en laboratoire.", "Faire découvrir les formations pour devenir ingénieur.", "Inaugurer l'ouverture d'un campus universitaire.", "Obtenir des conseils afin de créer une association."],
  reponseCorrecte: 1,
  explication: "La journée portes ouvertes de Polytech'Tours propose des présentations des études et métiers d'ingénieur, des visites et démonstrations pour faire découvrir les formations disponibles."
},
{
  id: 27, niveau: "B2",
  texte: "Une enquête réalisée auprès de professeurs révèle que le manuel scolaire numérique est préféré pour l'étude d'images, de photos, de cartes... Au contraire, le papier est privilégié pour la réalisation d'exercices, l'étude de textes et les évaluations. Les professeurs choisissent ainsi l'outil le mieux adapté à leurs besoins.\nPar ailleurs, les enseignants voient le manuel numérique comme un moyen de capter l'attention des élèves et d'améliorer la participation en classe.",
  question: "Quelle information donne cette enquête sur les pratiques des enseignants ?",
  options: ["Ils alternent les supports selon le type d'activité.", "Ils hésitent à utiliser les techniques informatiques.", "Ils optent toujours pour des ouvrages imprimés.", "Ils tiennent compte des progrès des apprenants."],
  reponseCorrecte: 0,
  explication: "L'enquête montre que les enseignants utilisent le numérique pour certaines activités (images, cartes) et le papier pour d'autres (exercices, évaluations), alternant les supports selon les besoins."
},
{
  id: 28, niveau: "B2",
  texte: "À l'inverse de George Balanchine, maître du ballet russe qui gagna New York pour réviser ses classiques, William Forsythe quitta les États-Unis pour jouer les électrons libres de la scène chorégraphique européenne. À la tête du Ballet de Francfort, William Forsythe s'attache depuis quinze ans à décomposer le ballet, ses codes et ses rites. Son écriture flirte avec le virtuel — le chorégraphe n'hésitant pas à utiliser des logiciels pour composer ses pièces de danse — autant qu'avec le théâtre, dont les textes répondant aux préoccupations des interprètes. Il nous revient avec un travail visionnaire autour du corps en mouvement. Réinventant les pointes ou déconstruisant la ligne du buste. Il n'est jamais vraiment là où on l'attend. Paris, qui le suit depuis une décennie lui passe beaucoup de choses, sauf une : son absence. Le voici donc sur la scène.",
  question: "Ses œuvres sont représentées...",
  options: ["en grande majorité New York.", "rarement ailleurs qu'à Francfort.", "en Russie et aux États-Unis.", "à Paris et partout en Europe."],
  reponseCorrecte: 3,
  explication: "Le texte précise que Forsythe dirige le Ballet de Francfort et que Paris le suit depuis une décennie, indiquant une présence régulière sur la scène européenne, notamment à Paris."
},
{
  id: 29, niveau: "B2",
  texte: "Monsieur,\nNous avons bien reçu votre offre de collaboration. Nous allons l'étudier dans les prochains jours.\nSans nouvelles de notre part d'ici trois semaines, vous pourrez considérer que votre candidature n'aura pas été retenue. Néanmoins, et sauf avis contraire de votre part, nous la conserverons au cas où de nouvelles opportunités se présentent.\nNous tenons à vous remercier de l'intérêt que vous avez porté à notre société.\nSincères salutations.\nLe Service Recrutement",
  question: "Qu'apprend le destinataire de ce courrier ?",
  options: ["Que sa candidature est sélectionnée.", "Que sa proposition est acceptée.", "Que son dossier est examiné.", "Que son recrutement est retardé."],
  reponseCorrecte: 2,
  explication: "La société indique qu'elle va étudier la candidature dans les prochains jours, ce qui signifie que le dossier est en cours d'examen."
},
{
  id: 30, niveau: "C1",
  texte: "Les recherches actuelles sur la motivation indiquent que la confiance en ses capacités permet d'agir efficacement et joue un rôle crucial dans l'engagement et les performances d'un élève. Cette confiance peut varier d'un domaine à l'autre ainsi que d'une matière scolaire à l'autre. Tout comme on peut se sentir très à l'aise avec des instruments de musique, mais maladroit sur un terrain de basket, on peut se sentir très compétant en français, mais peu brillant en mathématiques. Les recherches ont montré que les élèves confiants en leurs capacités dans une matière choisissent de préférence des activités présentant pour eux un défi et leur donnant l'occasion de développer leurs habiletés. Inversement, ils ont tendance à se désintéresser des activités dans lesquelles ils se sentent peu efficaces.",
  question: "Comment réagissent les élèves qui sont à l'aise dans certaines disciplines ?",
  options: ["Ils finissent par maîtriser l'ensemble des matières.", "Ils font des efforts dans les autres matières étudiées.", "Ils négligent les matières trop faciles pour eux.", "Ils se fixent des objectifs élevés dans ces matières."],
  reponseCorrecte: 3,
  explication: "Le texte indique que les élèves confiants dans une matière choisissent des activités représentant un défi pour développer leurs habiletés, ce qui correspond à se fixer des objectifs élevés dans ces matières."
},
{
  id: 31, niveau: "C1",
  texte: "Il ne viendrait à personne l'idée d'entrer dans un cinéma ou un théâtre sans payer sa place, ni à ces industries de ne pas rémunérer leurs auteurs. De nombreux festivals ou lieux dédiés à la photographie se targuent pourtant de la gratuité de leurs expositions. D'autant plus que dans la majorité des cas, il est admis qu'aucun budget ni aucun droit d'auteurs ne soient prévus pour le photographe. Même si le motif initial de rendre la photographie accessible à tous est plus que légitime, ce qui choquerait pour tout autre secteur ou corps de métier n'offusque personne dès lors qu'il s'agit du photographe, pourtant producteur de la matière première de ces activités.",
  question: "Que constate l'auteur de l'article ?",
  options: ["C'est la photographie qui est la forme d'art la moins valorisée.", "Il y a peu d'événements culturels consacrés à la photographie.", "Les photographies sont commercialisées à bas prix.", "N'importe qui peut s'improviser photographe."],
  reponseCorrecte: 0,
  explication: "L'auteur constate que les photographes ne sont ni payés ni protégés par des droits d'auteur dans les expositions, contrairement aux auteurs d'autres formes artistiques, ce qui en fait la forme d'art la moins valorisée."
},
{
  id: 32, niveau: "C1",
  texte: "Depuis un an, l'association du théâtre de la poudrerie, située à Sevran, à quelques kilomètres de Paris, organise des représentations gratuites à domicile d'une pièce inédite. Pour cela, l'association a convié une auteure professionnelle à venir en résidence pour l'écrire. Elle a recueilli le témoignage d'une trentaine d'habitantes sur le thème du pouvoir féminin, puis écrit son texte à partir de cette matière première. L'enjeu pour cette association est que les spectateurs s'approprient la pièce : quand il y a un phénomène d'identification, la parole se libère lors de la rencontre qui suit la représentation. Ce phénomène est amplifié par ce cadre intimiste qui favorise le rapprochement des spectateurs et des comédiens.",
  question: "Quel objectif poursuit cette association avec ce projet ?",
  options: ["Encourager le dialogue avec le public.", "Former des acteurs en banlieue.", "Réaliser une œuvre à plusieurs mains.", "Sensibiliser à l'égalité des sexes."],
  reponseCorrecte: 0,
  explication: "L'association vise à ce que les spectateurs s'approprient la pièce et libèrent la parole lors des échanges après la représentation, soit encourager le dialogue avec le public."
},
{
  id: 33, niveau: "C1",
  texte: "Des taxes « vertes » ou taxes carbone sont envisagées pour faire face aux financements nécessaires d'énergies non polluantes. Les mécanismes prévus dans le protocole de Kyoto concernent notamment le crédit carbone qui représente un volume d'émission de gaz à effet de serre (GES) évité et des permis d'émission négociables. Le crédit carbone est doté d'une valeur marchande et s'échange entre pays industrialisés. Un pays n'arrivant pas à atteindre son objectif de réduction des GES pourrait acheter des crédits carbone à un autre qui aurait dépassé son objectif. Ce système a été parfois qualifié de « permis à polluer » car un pays riche pourrait « acheter » le droit de polluer à un autre ayant réellement réduit ses émissions.",
  question: "Quel est le paradoxe de la taxe carbone ?",
  options: ["Elle concerne uniquement les économies fortes.", "Elle freine l'utilisation de ressources renouvelables.", "Elle permet le dépassement des normes édictées.", "Elle ralentit le progrès dans les États émergents."],
  reponseCorrecte: 2,
  explication: "Le paradoxe est qu'un pays riche peut acheter des crédits carbone pour continuer à polluer au-delà des normes fixées, ce qui permet le dépassement des normes édictées plutôt que leur respect."
},
{
  id: 34, niveau: "C1",
  texte: "Quel visage Paris pourrait-il prendre en 2100 ? C'est ce que le collectif d'architectes « Et alors... » a imaginé au travers de vingt cartes postales géantes, exposées à Paris. Ce qui donne un résultat surprenant, parfois utopique, parfois réaliste. Ainsi l'idée d'une centrale hydrothermique pour chauffer et refroidir tout un quartier, projet de la Compagnie Parisienne du Chauffage Urbain. Des potagers « partagés » au pied des immeubles en plein centre-ville, cela ressemble plus à un clin d'œil malicieux... le vélo a également la part belle : les architectes imaginent des voies rapides sur les toits de Paris, au milieu de toitures végétalisées et de jardins.",
  question: "Quel projet est présenté comme réaliste ?",
  options: ["L'extension d'un système de climatisation à tout un quartier.", "L'installation des parcs sur les toits des bâtiments parisiens.", "La construction de pistes cyclables au sommet des immeubles.", "La création de jardins communs pour planter des légumes."],
  reponseCorrecte: 0,
  explication: "La centrale hydrothermique pour chauffer et refroidir tout un quartier est présentée comme un projet réaliste car elle est portée par la Compagnie Parisienne du Chauffage Urbain, contrairement aux potagers ou aux pistes cyclables sur les toits jugés utopiques."
},
{
  id: 35, niveau: "C1",
  texte: "Bonjour,\nVous parlez dans votre article du risque de coupure générale d'électricité pour la Bretagne du fait d'une surconsommation. Or, cette région ne possède pas de source de production locale, ce qui implique une dépendance vis-à-vis du réseau et des lignes à haute tension ! La pression est forte à chaque épisode de grand froid... Le risque est réel, cependant les Bretons se serrent la ceinture ! La Bretagne s'est toujours montrée en avance dans l'action, comme un village d'irréductibles Gaulois entouré par les Romains ! Ce qui est agaçant, c'est que, pendant qu'ils jettent la pierre aux particuliers, les médias ne dénoncent pas l'absence d'efforts des milieux industriels ! C'est même écœurant de le constater, ils ne subissent aucune restriction à ce jour ! Qui consomme réellement plus ?\nAndré, fidèle lecteur",
  question: "Quelle est la réaction dont ce lecteur fait part ?",
  options: ["Il aimerait que sa région soit plus combative et engagée face aux problèmes locaux.", "Il réclame de nouvelles dispositions tarifaires pour que les factures soient moins élevées.", "Il s'indigne en estimant que les reproches faits aux consommateurs sont injustifiés.", "Il trouve inquiétantes les conséquences de la mauvaise gestion des sources d'énergie."],
  reponseCorrecte: 2,
  explication: "André s'indigne que les médias reprochent aux particuliers leur consommation alors que les milieux industriels ne subissent aucune restriction, estimant que les critiques envers les consommateurs sont injustifiées."
},
{
  id: 36, niveau: "C2",
  texte: "Ceux qui l'ont vu cet été aux Francofolies n'en sont pas revenus. Trente ans après ses débuts, le chanteur Joseph Many a subjugué l'assistance il lui a fallu du temps pour se convaincre que monter sur scène pour y pousser la chansonnette était encore de son âge. Les ritournelles des années 1970 l'avaient propulsé à son époque sur le devant de la scène, avec l'image d'un artiste terriblement proche de la jeunesse d'alors. Puis sa brillante carrière d'écrivain l'avait convaincu de se consacrer à l'écriture. Jusqu'à ce que l'inspiration musicale revienne. Preuve en est son nouvel album. Une ode à la vie, à l'amour, aux femmes. Les atmosphères sont délicieuses. Au fil des ballades, on redevient pour quelques minutes, adolescent.",
  question: "Pourquoi Joseph Many a-t-il tardé à revenir sur scène ?",
  options: ["Il se sentait trop vieux pour les tournées.", "Il voulait fuir son image d'idole des jeunes.", "Le public préférait l'écrivain au chanteur.", "Ses chansons étaient passées de mode."],
  reponseCorrecte: 0,
  explication: "Le texte indique qu'il lui a fallu du temps pour se convaincre que monter sur scène était encore de son âge, ce qui signifie qu'il se sentait trop vieux pour les tournées."
},
{
  id: 37, niveau: "C2",
  texte: "La bioéthique fait l'objet d'une polémique qui confronte deux écoles. Pour la première, composée de chercheurs et de rationalistes, le progrès scientifique ne saurait être limité. La recherche entraînera l'éradication des maladies génétique et permettra même de les prévoir. On en viendra à un eugénisme contrôlé qui améliorera l'espèce humaine et les dépenses de santé publique seront allégées. La seconde école, des philosophes ou des ecclésiastiques, affirme ses craintes en ce qui concerne la pratique d'un eugénisme scientifique : il permettra la sélection efficace des embryons et ouvrira de plus en plus largement ses critères de choix à des exigences non pathologiques. Pour eux, il est impossible de déterminer les tares inconciliables avec l'humain, puisque certains individus en ont fait l'origine même de leur génie.",
  question: "Sur quoi portent les réserves des partisans de la seconde école ?",
  options: ["Le coût social élevé de prise en charge des maladies génétiques.", "Le développement de traitements curatifs de pathologies génétiques.", "Le mode de financement de la recherche génétique fondamentale.", "Les dérives induites par l'amélioration du patrimoine génétique."],
  reponseCorrecte: 3,
  explication: "La seconde école craint que l'eugénisme scientifique aille au-delà du médical et sélectionne selon des critères non pathologiques, ouvrant la porte à des dérives dans l'amélioration du patrimoine génétique."
},
{
  id: 38, niveau: "C2",
  texte: "Les tagueurs pourront en prendre de la graine. Ils n'ont rien inventé. Universelle, l'envie de laisser une trace de son passage ou d'apostrophier l'autre à travers les siècles. Alix Barbet, fondatrice du Centre d'étude des peintures murales gallo-romaines, en apporte une preuve éclatante en explorant les tags d'il y a... deux mille ans. Ces témoignages fragiles constituent, selon l'auteur, un matériau archéologique d'autant plus exceptionnel qu'ils sont « tout ce qui nous reste de l'humeur de l'écriture et du langage quotidien, des petites gens pour la plupart, et qui contrebalance la vision que l'on pourrait avoir de la culture gallo-romaine dans les provinces à travers les documents officiels qui nous sont parvenus. »\n(1) Tagueur : personne qui dessine des tags, graffiteur. (2) Tag : signature codée formant un dessin d'intention décorative sur une surface (mur, voiture de métro...) ; graffiti.",
  question: "Que dit cet article ?",
  options: ["La pratique de la peinture murale a pris naissance à l'ère gallo-romaine.", "Les archéologues refusent de reconnaître la valeur des graffitis gallo-romains.", "Les tagueurs d'aujourd'hui se sont inspirés des œuvres gallo-romaines.", "L'expression picturale populaire existait durant l'époque gallo-romaine."],
  reponseCorrecte: 3,
  explication: "L'article révèle que des tags existaient déjà il y a deux mille ans à l'époque gallo-romaine, prouvant que l'expression picturale populaire n'est pas une invention moderne."
},
{
  id: 39, niveau: "C2",
  texte: "Depuis l'adolescence, je fréquente assidûment les dictionnaires.\nChaque fois que je bute sur un mot, que je suis dans le flou culturel, ils m'apportent la réponse et ouvrent de nouveaux horizons à ma curiosité en me renvoyant souvent à d'autres ouvrages. J'en possède une centaine et chacun est une bibliothèque à lui seul. Tous sont autant de béquilles de ma culture. Par exemple, quand vous cherchez le mot juste, rien de tel qu'un dictionnaire des synonymes ! On ouvre un dictionnaire pour se renseigner sur une question précise comme on lirait la notice d'un produit pharmaceutique destiné à soigner ceci ou cela. C'est le self-service de la pensée !\nJean-Claude Siméon, éditeur.",
  question: "Pourquoi Jean-Claude Siméon aime-t-il les dictionnaires ?",
  options: ["Pour découvrir de nouvelles références.", "Pour posséder une bibliothèque fournie.", "Pour s'évader vers des horizons lointains.", "Pour trouver des remèdes à ses maux."],
  reponseCorrecte: 0,
  explication: "L'auteur explique que les dictionnaires ouvrent de nouveaux horizons à sa curiosité en le renvoyant à d'autres ouvrages, soit pour découvrir de nouvelles références."
}
];