import type { QuestionCE } from "./types";

export const questionsSerie6: QuestionCE[] = [
  // --- NIVEAU A1 ---
  {
    id: 1, niveau: "A1",
    texte: "Je suis en consultation revenez dans quelques minutes.",
    question: "Que faire pour rencontrer l'infirmière ?",
    options: ["Frapper et entrer", "Prendre rendez-vous", "Revenir plus tard", "Téléphoner"],
    reponseCorrecte: 2, explication: "L'affichage indique que l'infirmière est en consultation et demande de revenir dans quelques minutes."
  },
  {
    id: 2, niveau: "A1",
    texte: "Du 10 avril au 15 septembre, les ascenseurs de votre station de métro sont en réparation. Pour faciliter vos déplacements, les installations changent. Pendant les travaux, prenez l'escalier à droite des guichets.",
    question: "Qu'est-ce qui est fermé du 10 avril au 15 septembre ?",
    options: ["L'escalier", "La station de métro", "Les ascenseurs", "Les guichets"],
    reponseCorrecte: 2, explication: "L'annonce indique que les ascenseurs sont en réparation du 10 avril au 15 septembre."
  },
  {
    id: 3, niveau: "A1",
    texte: "Consommez cinq fruits et légumes par jour. Limitez la quantité de viande rouge, de beurre, de sucre et de sel et buvez au moins huit verres d'eau par jour ! Vous ferez le plein d'énergie !",
    question: "Que permet le conseil de « Vie pratique » ?",
    options: ["De faire des économies", "De pratiquer un sport", "De rester en bonne santé", "De trouver des produits bios"],
    reponseCorrecte: 2, explication: "Les conseils sur l'alimentation (fruits, légumes, eau) visent à rester en bonne santé."
  },
  {
    id: 4, niveau: "A1",
    texte: "Vous souhaitez améliorer votre niveau en langue étrangère ?\nLe Conseil de l'Europe offre à ses salariés des formations dans les langues des pays de l'Union Européenne. Inscrivez-vous dès maintenant pour les cours d'italien et d'allemand.",
    question: "Qu'est-ce que le Conseil de l'Europe propose à ses employés ?",
    options: ["Des cours gratuits.", "Des postes à l'étranger.", "Des stages en Italie.", "Des voyages en Europe."],
    reponseCorrecte: 0, explication: "Le Conseil offre des formations linguistiques à ses salariés, c'est-à-dire des cours gratuits."
  },
  // --- NIVEAU A2 ---
  {
    id: 5, niveau: "A2",
    texte: "Examen de biologie\nJuin à 15h30 en salle 454.",
    question: "Quelle information manque au sujet de cet examen ?",
    options: ["La date", "La matière", "Le lieu", "L'heure"],
    reponseCorrecte: 0, explication: "On connaît la matière (biologie), le lieu (salle 454) et l'heure (15h30), mais pas la date exacte de juin."
  },
  {
    id: 6, niveau: "A2",
    texte: "Stéphane,\nTu peux apporter le dessert jeudi soir ? Claude s'occupe des entrées, Dominique des boissons et moi du plat principal. En invités-surprise, d'autres copains de notre terminale S3. C'est super de se retrouver tous, dix ans après le lycée.\nMaryse",
    question: "Qu'est-ce que Maryse organise ?",
    options: ["Un concours de cuisine entre amis", "Un dîner entre anciens élèves", "Un repas avec toute sa famille", "Une fête de fin d'année scolaire"],
    reponseCorrecte: 1, explication: "Maryse réunit des copains de terminale dix ans après le lycée, c'est donc un dîner entre anciens élèves."
  },
  {
    id: 7, niveau: "A2",
    texte: "Anne gérante de Somya, nouvelle boutique spécialisée dans la décoration, vous attend pour vous proposer de nombreux produits et livres spécialisées.",
    question: "De quoi parle l'annonce ?",
    options: ["De la fermeture d'un magasin", "De l'anniversaire d'un magasin", "De la transformation d'un magasin", "De l'ouverture d'un magasin"],
    reponseCorrecte: 3, explication: "L'annonce présente une « nouvelle boutique », ce qui indique l'ouverture d'un magasin."
  },
  {
    id: 8, niveau: "A2",
    texte: "Lundi 20 juin\nMme Rico sera absente de son bureau exceptionnellement aujourd'hui, lundi. Pour avoir un rendez-vous, vous pourrez la contacter demain à partir de 14 heures. Merci de votre compréhension.",
    question: "Quand madame Rico sera-t-elle disponible ?",
    options: ["Dans la journée", "Le lendemain", "Le soir-même", "Vendredi matin"],
    reponseCorrecte: 1, explication: "Le message indique que Mme Rico peut être contactée « demain », soit le lendemain du lundi 20 juin."
  },
  {
    id: 9, niveau: "A2",
    texte: "Cher confrère,\nCi-joint notre catalogue de boissons pour cette année. En espérant que vous pourrez satisfaire votre clientèle, nous vous remercions pour vos futurs achats. Avec nos salutations les plus cordiales.\nEntreprise Labayle et Chandon.",
    question: "Quel est l'objet de ce courrier ?",
    options: ["Demander des informations sur des produits", "Passer une commande de produits", "Présenter de nouveaux produits", "Proposer une dégustation de produit."],
    reponseCorrecte: 2, explication: "L'entreprise envoie son catalogue pour présenter ses produits à un client potentiel."
  },
  {
    id: 10, niveau: "A2",
    texte: "Noël Approche !\nPour que vos colis arrivent avant les fêtes, nous vous proposons de les transporter en mode express. Renseignez-vous auprès de nos conseillers ou rendez-vous directement au guichet.",
    question: "À quoi sert ce service ?",
    options: ["À acheter des cadeaux", "À envoyer des paquets", "À louer des camions", "À réserver des billets"],
    reponseCorrecte: 1, explication: "Le service propose de transporter des colis, c'est-à-dire d'envoyer des paquets, avant les fêtes."
  },
  // --- NIVEAU B1 ---
  {
    id: 11, niveau: "B1",
    texte: "Nous célébrons nos 40 ans ce soir : Nous essaierons de ne pas mettre la musique trop fort, sinon n'hésitez pas et venez nous voir ! Les invités partiront vers 2h au matin. Merci.\nAnne et Patrick.",
    question: "Pour quelle raison Anne et Patrick ont-ils écrit ce message ?",
    options: ["Pour inviter des amis à leur anniversaire", "Pour organiser une réunion entre locataires", "Pour prévenir leurs voisins de leur fête", "Pour trouver des musiciens pour la soirée"],
    reponseCorrecte: 2, explication: "Le message prévient que la fête durera jusqu'à 2h du matin et s'excuse à l'avance du bruit, c'est donc une notification aux voisins."
  },
  {
    id: 12, niveau: "B1",
    texte: "Fini les souvenirs de voyage trop flous. Pour s'entraîner, direction Lyon pour un week-end. Sur place, une jeune agence spécialisée vous propose un stage pour découvrir la ville autrement. L'objectif : sur une journée, travailler la photographie et découvrir en même temps avec un guide les monuments historiques de la ville. Vous profitez toute la journée des conseils d'un professionnel qui vous montre les endroits secrets de Lyon. Il vous explique comment utiliser la lumière naturelle.",
    question: "Que propose cette agence ?",
    options: ["D'apprendre à s'orienter dans la ville", "De se former au métier de guide", "De visiter des expositions photo", "De voir Lyon d'une façon différente"],
    reponseCorrecte: 3, explication: "L'agence propose de découvrir Lyon « autrement », c'est-à-dire d'une façon différente grâce à la photographie et des visites guidées."
  },
  {
    id: 13, niveau: "B1",
    texte: "Chers Clients\nVotre supermarché vous accueille depuis 60 ans, le propriétaire et son équipe vous invitent à une semaine de festivités. À partir du 10 août, plus de 1000 OFFRES EXCEPTIONNELLES et des réductions JUSQU'À 50% sur les articles vous attendent.",
    question: "Qu'est-ce qu'on fête ?",
    options: ["L'anniversaire d'un magasin", "L'augmentation des ventes", "L'ouverture d'un commerce", "Le début des soldes d'été"],
    reponseCorrecte: 0, explication: "Le supermarché accueille ses clients « depuis 60 ans » et organise des festivités pour célébrer cet anniversaire."
  },
  {
    id: 14, niveau: "B1",
    texte: "Fils et petit-fils de vendeurs de fruits et légumes, Anthony Palou raconte les moments drôles et tendres de son enfance à Quimper, en Bretagne, dans les années 1970. Retour sur les riches heures du petit commerce et sur sa destruction par les supermarchés poursuivi par les banquiers, le père de l'auteur devra fermer. Le deuxième roman de l'auteur de Camille confirme un réel talent.",
    question: "Quel est l'objectif de cet article ?",
    options: ["Annoncer la sortie d'un roman", "Défendre les petits commerces", "Donner la parole à des enfants", "Faire connaître la ville de Quimper"],
    reponseCorrecte: 0, explication: "L'article présente le deuxième roman d'Anthony Palou et souligne son talent d'auteur, c'est donc une annonce de sortie littéraire."
  },
  {
    id: 15, niveau: "B1",
    texte: "On fait des affaires ? C'est le titre de l'émission que notre radio vous propose d'écouter pour découvrir la vie d'une entreprise française. Apprenez à parler la langue des affaires et à comprendre les comportements et la culture du travail en France.",
    question: "Que propose cette émission ?",
    options: ["Une familiarisation avec les codes socioprofessionnels français", "Une formation à de nouvelles méthodes technico-commerciale", "Une préparation pour travailler dans une entreprise à l'étranger", "Une préparation des emplois dans des sociétés internationales"],
    reponseCorrecte: 0, explication: "L'émission propose d'apprendre la langue des affaires et les comportements professionnels français, soit une familiarisation avec les codes socioprofessionnels."
  },
  {
    id: 16, niveau: "B1",
    texte: "Bonne idée\nNuméro 1 français de badminton, Brice Leverdez a lancé lundi une opération de « financement participatif » pour sa préparation aux jeux Olympiques. Une manière de récolter de l'argent supplémentaire dans un sport peu sponsorisé. « C'est un moyen pour les gens de faire partie du projet. Si je rapporte une médaille des prochains JO, ils pourront dire qu'ils ont aidé Brice Leverdez à y arriver », explique-t-il.",
    question: "Qu'est-ce que les donateurs peuvent espérer ?",
    options: ["Un rendez-vous avec le sportif", "Une place offerte pour les JO", "Une séance de badminton", "Une victoire de Brice Leverdez"],
    reponseCorrecte: 3, explication: "Le sportif explique que les donateurs pourront dire qu'ils l'ont aidé à remporter une médaille, soit espérer sa victoire."
  },
  {
    id: 17, niveau: "B1",
    texte: "Courir les 42,195 km du marathon de Paris ne s'improvise pas. C'est une course qui nécessite de s'entraîner régulièrement et d'être capable de surmonter le « mur de douleur » qui survient chez tous les marathoniens entre le 32e et 37e kilomètre. « Pour espérer terminer l'épreuve, il faut courir depuis au moins un an et dans les dix dernières semaines, faire trois à quatre heures d'entraînement hebdomadaires réparties en autant de séances », insiste un organisateur de stage de préparation.",
    question: "Quel est le conseil de cet organisateur avant de participer au marathon ?",
    options: ["Avoir comme seul objectif de terminer l'épreuve", "Pratiquer la course à pied plusieurs fois par semaine", "Prendre régulièrement des médicaments anti-douleur", "Se donner de longues périodes de récupération"],
    reponseCorrecte: 1, explication: "L'organisateur préconise de faire trois à quatre heures d'entraînement hebdomadaires réparties en plusieurs séances, c'est-à-dire courir plusieurs fois par semaine."
  },
  {
    id: 18, niveau: "B1",
    texte: "Le Marché des saveurs est ouvert : venez y découvrir le savoir-faire de notre région : Poulets rôtis, viandes grillées, charcuteries, fromages frais, miel, confitures, tartes, gâteaux.\nVous composerez votre menu et dégusterez nos petits plats sous le chapiteau de la buvette. Vous vous laisserez également séduire par nos artisans avec des peintres, des créateurs de bijoux, des couturiers, des botanistes, tous du pays et vous serez peut-être tentés par des jouets en bois, un tableau romantique ou un bouquet de fleurs séchées.",
    question: "Que peut-on acheter au marché des saveurs ?",
    options: ["Des objets d'arts", "Des spécialités locales", "Des produits écologiques", "Des marchandises exotiques"],
    reponseCorrecte: 1, explication: "Le marché propose des produits régionaux (fromages, charcuteries, miel...), soit des spécialités locales."
  },
  {
    id: 19, niveau: "B1",
    texte: "Les repas servis dans les avions de ligne ont toujours été tristement réputés pour leur fadeur. Mais il semblerait que les chefs n'y soient pour rien. D'après une étude, les nuisances sonores importantes peuvent en effet réduire la sensibilité des palais, rendant la nourriture peu savoureuse. Le vrombissement des réacteurs expliquerait le peu d'enthousiasme des passagers pour les plateaux servis à bord. Les chercheurs ont aussi découvert que des sons agréables pouvaient faire mieux apprécier les mets.",
    question: "Quelle est la conclusion de cette étude ?",
    options: ["L'anxiété en avion diminue la sensation de faim", "La qualité de la nourriture se détériore en altitude", "Le bruit altère le sens du goût des passagers", "Les plats proposés en vol manquent de saveur"],
    reponseCorrecte: 2, explication: "L'étude conclut que les nuisances sonores (le bruit des réacteurs) réduisent la sensibilité des palais et rendent la nourriture moins savoureuse."
  },
  // --- NIVEAU B2 ---
  {
    id: 20, niveau: "B2",
    texte: "Madame, Monsieur,\nCe courrier fait suite à mon achat d'un téléphone le 4 mars dernier. Après réflexion, je souhaiterais le rendre, car j'ai finalement décidé d'acheter un appareil avec messagerie intégrée.\nAinsi, je vous prie de bien vouloir me restituer la somme de 75 euros, correspondant à la somme versée le 5 mars par chèque.\nDans l'attente de votre réponse, je vous transmets, Madame, Monsieur, mes meilleures salutations.\nAndré Cellier",
    question: "Quel est l'objet de la lettre de monsieur Cellier ?",
    options: ["Le remboursement de son article", "L'échange de son téléphone", "L'envoi de son téléphone par la poste", "Une réclamation sur son achat"],
    reponseCorrecte: 0, explication: "M. Cellier demande à être remboursé de 75 euros suite au retour de son téléphone."
  },
  {
    id: 21, niveau: "B2",
    texte: "Pendant un an, la journaliste allemande Gret Taubert a décidé de vivre sans la société de consommation sans quitter son appartement berlinois. Pendant cette expérience, elle a bu, mangé, s'est habillée sans payer : elle a échangé jupes et pantalons avec ses voisines, planté des légumes dans un jardin collectif. Pour ses vacances, elle est allée chez des amis en faisant de l'auto-stop. « Aujourd'hui, je suis contente de ne plus vivre aussi radicalement, c'était difficile mais je cherche à intégrer dans mon quotidien ce que j'ai appris », explique-t-elle.",
    question: "Quel est le constat de Gret Taubert après cette expérience ?",
    options: ["C'est possible à la campagne.", "C'est possible avec du temps.", "C'est possible, mais pénible.", "C'est possible pour tous"],
    reponseCorrecte: 2, explication: "Gret Taubert admet que c'était « difficile » mais possible, ce qui correspond à « c'est possible, mais pénible »."
  },
  {
    id: 22, niveau: "B2",
    texte: "L'année dernière, une étude publiée par la revue Nature faisait grand bruit, menée par une équipe de l'université de Zurich : l'étude montrait qu'une odeur d'ocytocine diffusée lors d'un entretien avec un banquier pousse les gens à lui confier leur argent !\nL'expérience portait sur 56 personnes qui acceptaient de jouer à un jeu d'argent. On leur donnait une somme et ils devaient dire s'ils acceptaient ou non de la confier à un banquier après un entretien avec lui. Avant la discussion, la moitié des personnes avaient respiré un spray d'ocytocine, hormone connue pour jouer un rôle dans l'établissement des relations interpersonnelles.",
    question: "Quel est le but de cette expérience ?",
    options: ["Apprendre à gérer une entrevue importante avec un banquier", "Déterminer le lien, positif ou non, que les gens ont avec l'argent", "Identifier les conditions et facteurs d'addiction aux jeux de hasard", "Montrer l'importance de la chimie dans les rapports humains"],
    reponseCorrecte: 3, explication: "L'expérience mesure l'effet d'une hormone (l'ocytocine) sur la confiance envers un banquier, démontrant le rôle de la chimie dans les relations humaines."
  },
  {
    id: 23, niveau: "B2",
    texte: "Éducation numérique\nIl n'y a presque plus aujourd'hui de manuel scolaire qui paraisse sans avoir une double traduction, numérique et en ligne. C'est devenu le standard de la production au terme d'une mutation très rapide. Mais cependant, nous restons en proximité forte avec le manuel classique. De nouvelles applications qui seraient déconnectées du livre papier ne nous paraissent pas encore à ce stade conformes à notre mission, ni répondre aux attentes de la majorité des enseignants. En outre, cela ne correspond pas à l'équipement de la très grande majorité des établissements. Autrement dit, les conditions d'un changement d'ensemble ne sont pas réunies.\nM. Huet, éditeur de manuels scolaires",
    question: "Quelle est la position de cet éditeur de manuels sur la croissance du support numérique ?",
    options: ["Il considère que l'ère du support papier est définitivement terminée", "Il estime qu'il reste du travail à faire pour mieux préparer cette évolution", "Il juge indispensable de n'utiliser que les supports électroniques", "Il pense qu'il faut privilégier le contact des élèves avec l'outil internet"],
    reponseCorrecte: 1, explication: "M. Huet reconnaît la mutation numérique mais estime que les conditions ne sont pas encore réunies pour aller plus loin, donc qu'il reste du travail à faire."
  },
  {
    id: 24, niveau: "B2",
    texte: "On réserve trop facilement le covoiturage aux étudiants sans un sou. Les clichés sont tenaces. Pourtant, le temps de la petite annonce papier accrochée près de la machine à café est bel et bien terminé, les nouveaux moyens de communication ont changé les choses. L'organisation d'un trajet entre plusieurs personnes qui se rendent dans la même direction est devenue si simple et si efficace avec les sites spécialisés que le covoiturage est en train d'élargir son public de gagner son statut de mode de transport à part entière.",
    question: "Quel développement connaît le covoiturage ?",
    options: ["Il devient la solution idéale des voyages organisés à la dernière minute.", "Il est accessible à un nombre croissant d'utilisateurs grâce à internet.", "Il occupe une place grandissante dans les petites annonces des journaux.", "Il s'impose comme le moyen de déplacement à la mode chez les jeunes."],
    reponseCorrecte: 1, explication: "Les sites spécialisés ont simplifié le covoiturage et élargi son public, le rendant accessible à un nombre croissant d'utilisateurs grâce à internet."
  },
  {
    id: 25, niveau: "B2",
    texte: "Le temps des cerises\nPièce de théâtre de Niels Arestrup\nUn vieil homme, dérangé dans sa vieille maison par une jeune femme : dispute, goût de la vie retrouvé, moments de tendresse. La comédienne Cécile de France joue avec autant de talent qu'au cinéma. Le comédien Eddy Mitchell, dans le rôle du vieux peintre, manque de noirceur. Dommage que le metteur en scène n'interprète pas lui-même le personnage principal. On passe un bon moment mais pas un grand moment.",
    question: "Sur quel aspect de la pièce porte la critique ?",
    options: ["La mise en scène", "La qualité des décors", "Le jeu des interprètes", "L'intérêt de l'intrigue"],
    reponseCorrecte: 2, explication: "Le critique commente le jeu de Cécile de France (très bon) et d'Eddy Mitchell (manque de noirceur), portant ainsi sur le jeu des interprètes."
  },
  {
    id: 26, niveau: "B2",
    texte: "Les auteurs européens ont persuadé la maison d'édition Livresque d'aller plus loin que la simple numérisation des livres universitaires : au lieu de ne scanner les livres qu'à des fins de recherche, les écrivains ont demandé à ce qu'ils soient remis dans le circuit commercial. Grâce à cet accord, ces millions de livres épuisés vont reprendre vie. Les bénéfices générés par la publicité et les droits de licence iront en partie à Livresque, mais la grande majorité de l'argent gagné par cette mise à disposition des ouvrages sera directement remise aux auteurs puisqu'ils toucheront leurs droits.",
    question: "D'après le texte, quel avantage les auteurs tireront-ils de la numérisation des livres ?",
    options: ["Elle augmentera le nombre de lecteurs", "Elle développera la visibilité des œuvres", "Elle diminuera le coût des ouvrages", "Elle entraînera un gain financier"],
    reponseCorrecte: 3, explication: "La majorité de l'argent généré sera remise aux auteurs qui toucheront leurs droits, représentant un gain financier."
  },
  {
    id: 27, niveau: "B2",
    texte: "Depuis plusieurs années, Thierry Marx, un grand chef français, intervient pour donner des cours de cuisine en prison. Faire découvrir à ce public, contraint de vivre en milieu fermé, qu'une profession, quelle qu'elle soit, peut être épanouissante, est une tâche qui le passionne et nécessite très naturellement une grande énergie. Le désir de rallumer cette lueur d'espoir, de montrer « qu'après », il peut y avoir une réinsertion réussie et que chacun porte en lui, c'est un moteur pour relever ce défi.",
    question: "Pourquoi Thierry Marx intervient-il dans les prisons ?",
    options: ["Pour améliorer les méthodes de travail de la cantine", "Pour encourager la création de formations professionnelles", "Pour faire naître l'envie de s'investir dans un métier", "Pour sensibiliser le grand public à la réalité de la vie carcérale"],
    reponseCorrecte: 2, explication: "Thierry Marx veut montrer aux détenus qu'une profession peut être épanouissante pour leur donner l'envie de se réinsérer professionnellement."
  },
  {
    id: 28, niveau: "B2",
    texte: "En rendant accessible à tout moment une multitude d'informations, internet modifie profondément notre relation à la connaissance. Il serait pourtant tout à fait illusoire d'imaginer que ce qui est accessible sur la toile n'a pas besoin d'être appris pour la simple raison de sa disponibilité permanente, car posséder tous les livres du monde, comme pouvoir accéder à tous les sites du monde, ne se substitue pas à la connaissance. Avoir accès par la toile aux mêmes informations ne compense absolument pas l'absence d'apprentissage.",
    question: "D'après l'article, de quelle manière internet agit-il sur nous ?",
    options: ["Il change notre regard sur les livres", "Il facilite la mémorisation de nouveaux concepts", "Il revaloraise la culture transmise par l'école", "Il transforme notre rapport au savoir"],
    reponseCorrecte: 3, explication: "L'article explique qu'internet modifie profondément notre relation à la connaissance, c'est-à-dire notre rapport au savoir."
  },
  {
    id: 29, niveau: "B2",
    texte: "Aux débuts d'internet, je me souviens d'avoir lu, éberluée, dans un magazine féminin « Mon mari était absent, il passait tout son temps sur le chat » et j'en étais à tenter de visualiser ce triste état de fait lorsque je compris ma méprise : avoir confondu le chat, le félidé, avec le chat, la discussion sur internet. Depuis ce jour, aucun progrès sur cette équivoque terrible de la langue, alors que l'usage informatique du mot souris démultiplie les sources de confusions. Le bon sens voudrait que la phonétique l'emporte et que l'on écrive « tchat ». Au lieu de cette solution évidente, le Petit Larousse laissé entrer en 2003 dans le dictionnaire le monstrueux mot-valise « clavardage »",
    question: "Qu'est-ce qui dérange l'auteur de ce texte ?",
    options: ["L'abus d'anglicisme en langage informatique", "L'ambiguïté du néologisme « chat » à l'écrit.", "Le laxisme orthographique dans les forums.", "Le manque d'imagination des lexicologues."],
    reponseCorrecte: 1, explication: "L'auteur est gênée par la confusion entre « chat » (l'animal) et « chat » (la discussion en ligne), soit l'ambiguïté du néologisme à l'écrit."
  },
  // --- NIVEAU C1 ---
  {
    id: 30, niveau: "C1",
    texte: "Elle s'appelait Sarah\nLe cinéaste n'arrive pas à éviter - mais le pouvait-il ? - l'artifice du scénario : ping-pong incessant et artificiel entre le passé et le présent. Néanmoins, chaque fois qu'il change d'époque, le cinéaste repart à la recherche de l'émotion perdue qu'il retrouve, d'ailleurs, à force de pudeur et de retenue. Aucun débordement lacrymal. Les acteurs restent jusqu'au bout étonnamment sobres. Le film est un mélo, un vrai, puisqu'il repose sur une faute dont chacun ne peut ou ne veut se défaire. C'est aussi « un film du samedi soir », avec ses drames, ses sacrifices, parfois même ses outrances. Bref, on est dans le cinéma humaniste à l'ancienne (et, peut-être, éternel). À la frontière exacte, en tout cas, entre bons et grands sentiments.",
    question: "Sur quel élément du film porte la réserve du critique ?",
    options: ["À l'atmosphère lourde et pathétique", "L'utilisation abusive de flashbacks", "La caricature du film de genre", "Le jeu sans conviction des comédiens"],
    reponseCorrecte: 1, explication: "Le critique pointe l'« artifice du scénario » avec un « ping-pong incessant et artificiel entre le passé et le présent », ce qui correspond à l'utilisation abusive de flashbacks."
  },
  {
    id: 31, niveau: "C1",
    texte: "De : Marc@radiocanada.com\nObjet : Remerciements\nCher tous,\nAmis, technicien, auditeurs, animateurs, président de notre radio, vous qui avez toujours été là pour des Airs, je voulais vous dire un très grand merci ! Je le répéterai le 1er juillet pour la dernière fois sur les ondes à l'occasion de la 200e : notre radio été pour moi un merveilleux espace de liberté ! Laissez-moi remercier encore notre président qui continue à la faire vivre ! Quel bonheur de vous avoir eu tous autour de moi samedi ! Merci encore.\nMarc,",
    question: "Qu'ont-ils tous fêté samedi ?",
    options: ["L'anniversaire d'une radio", "La 200e édition d'une émission", "Le départ d'une animatrice", "Le travail d'un directeur"],
    reponseCorrecte: 1, explication: "Marc mentionne « l'occasion de la 200e » et le rassemblement de samedi, indiquant qu'ils ont célébré la 200e édition d'une émission."
  },
  {
    id: 32, niveau: "C1",
    texte: "La première difficulté, qu'il avait en réalité sous-estimée, fut de réussir à atteindre l'extrémité du trottoir, c'est-à-dire de franchir la masse mouvante et compacte des hommes et des femmes qui marchaient devant lui, frange large de deux ou trois mètres mais dont la texture était dense, mobile, paisiblement hostile. Il eut beau dans un premier temps prononcer à haute voix de nombreuses paroles d'excuse, expliquant avec des gestes modestes qu'il voulait passer, se montrer on ne peut plus poli et plus encore, personne ne s'arrêta, ni ne se poussa afin de lui permettre de se faufiler entre les corps. Les hommes et les femmes qui marchaient ne le regardaient pas et beaucoup avaient sur les oreilles des écouteurs.",
    question: "Dans quelle situation se trouve le personnage principal ?",
    options: ["Il a du mal à se déplacer dans la foule", "Il est emporté par une foule pressée", "Il est paralysé par l'hostilité de la foule", "Il imagine les répliques impolies de la foule"],
    reponseCorrecte: 0, explication: "Le personnage tente de traverser une foule compacte et n'y arrive pas malgré ses efforts de politesse, il a donc du mal à se déplacer."
  },
  {
    id: 33, niveau: "C1",
    texte: "Mais qu'est-ce qu'être autonome ?\nL'autonomie été un idéal de la fin des années 70 et depuis, c'est devenue une norme. Mais qu'est-ce qu'être autonome ? Est-ce rechercher en soi les forces pour agir ? Cette représentation d'un sujet en relation avec lui-même est contestée par certains penseurs pour qui agir par soi-même, ce n'est pas s'inventer mais être capable de se diriger seul. Autrement dit, on peut être autonome en appliquant des règles que l'on a apprises et dont l'origine ne se trouve donc pas au fond de nous mais dans le contexte social où nous existons. Ces règles apparaissent alors comme des capacités et non plus comme une limitation des possibilités de l'action.",
    question: "Qu'est-ce qu'être autonome, selon ce texte ?",
    options: ["Devenir indifférent aux autres", "Disposer de ressources intérieures", "Exploiter les compétences acquises", "S'éloigner de la vie en société"],
    reponseCorrecte: 2, explication: "Selon le texte, être autonome c'est appliquer des règles apprises (des compétences acquises) pour se diriger soi-même."
  },
  {
    id: 34, niveau: "C1",
    texte: "Monsieur et madame Martin n'ont pas un emploi du temps également captivant. Quand monsieur se rend au travail, madame manie l'aspirateur. Quand il est au bureau, elle achète des surgelés au supermarché. Quand il se cale devant la télé, l'épouse modèle se colle aux fourneaux. Une illustration exhumée d'un manuel des années 1950 ? Non, les images d'un exercice pour une classe de CP afin de « Comprendre la « simultanéité » en étudiant les moments de la journée d'une famille ». Quand Virginie Sassoon est tombée sur ce document ultra-stéréotypé dans le classeur de sa fille, cette maman est tombée des nues. « Cette fiche dévoile une forme de violence symbolique qui persiste dans notre société et qui relève, selon moi, de la responsabilité collective. »",
    question: "Pourquoi Virginie Sassoon est-elle choquée par les exercices proposés dans la classe de sa fille ?",
    options: ["Ils correspondent à des programmes scolaires obsolètes", "Ils méconnaissent l'existence des familles recomposées", "Ils présentent un partage sexiste des tâches dans le couple", "Ils se moquent du quotidien des personnes sans emploi"],
    reponseCorrecte: 2, explication: "L'exercice montre madame à la maison pendant que monsieur travaille, ce qui représente un partage sexiste des tâches que Virginie Sassoon qualifie de « violence symbolique »."
  },
  {
    id: 35, niveau: "C1",
    texte: "Ceux qui l'ont vu cet été aux Francofolies n'en sont pas revenus. Trente ans après ses débuts, le chanteur Joseph Many a subjugué l'assistance. Il lui fallut temps pour se convaincre que monter sur scène pour y pousser la chansonnette était encore de son âge. Les ritournelles des années 1970 l'avaient propulsé à son époque sur le devant de la scène, avec l'image d'un artiste terriblement proche de la jeunesse d'alors. Puis sa brillante carrière d'écrivain l'avait convaincu de se consacrer à l'écriture, jusqu'à ce que l'inspiration musicale revienne. Preuve en est son nouvel album. Une ode à la vie, à l'amour, aux femmes. Les atmosphères sont délicieuses. Au fil des ballades, on redevient, pour quelques minutes, adolescent.",
    question: "Pourquoi Joseph Many a-t-il tardé à revenir sur scène ?",
    options: ["Il se sentait trop vieux pour les tournées.", "Il voulait fuir son image d'idole des jeunes.", "Le public préférait l'écrivain au chanteur.", "Ses chansons étaient passées de mode."],
    reponseCorrecte: 0, explication: "Il lui fallut du temps pour se convaincre que monter sur scène « était encore de son âge », c'est-à-dire qu'il se sentait trop vieux."
  },
  // --- NIVEAU C2 ---
  {
    id: 36, niveau: "C2",
    texte: "La bioéthique fait l'objet d'une polémique qui confronte deux écoles.\nPour la première, composée de chercheurs et de rationalistes, le progrès scientifique ne saurait être limité. La recherche entraînerait l'éradication des maladies génétiques et permettrait même de les prévoir. On en viendra à un eugénisme contrôlé qui améliorera l'espèce humaine et les dépenses de santé publique seront allégées. La seconde école, de philosophes ou des ecclésiastiques, affirme ses craintes en ce qui concerne la pratique d'un eugénisme scientifique. Il permettra la sélection efficace des embryons et ouvrira de plus en plus largement ses critères de choix à des exigences non pathologiques. Pour eux, il est impossible de déterminer les tares inconciliables avec l'humain, puisque certains individus en ont fait l'origine même de leur génie.",
    question: "Sur quoi portent les réserves des partisans de la seconde école ?",
    options: ["Le coût social élevé de prise en charge des maladies génétiques.", "Le développement de traitements curatifs de pathologies génétiques.", "Le mode de financement de la recherche génétique fondamentale.", "Les dérives induites par l'amélioration du patrimoine génétique."],
    reponseCorrecte: 3, explication: "La seconde école craint que la sélection des embryons dérive vers des exigences non pathologiques, soit des dérives liées à l'amélioration du patrimoine génétique."
  },
  {
    id: 37, niveau: "C2",
    texte: "Mozart est le compositeur le plus joué. Le plus aimé et le plus exploité. Ainsi, en 1993, la psychologue américaine Frances Rausher annonçait que l'écoute de la sonate pour deux pianos en ré majeur développait l'intelligence. En effet, après avoir écouté ce morceau, 36 étudiants avaient obtenu de meilleurs résultats à un test de localisation spatiale. L'étude eut un retentissement fracassant, on examina la teneur en haute fréquence de la sonate. On la fit écouter à des rats de laboratoire avant de les perdre dans un labyrinthe. On évoqua l'influence des gènes. En 1999, une nouvelle étude venait contredire les conclusions de Frances Rauscher.",
    question: "À quelle conclusion est arrivée Frances Rauscher concernant l'écoute de la Sonate de Mozart ?",
    options: ["Elle a un effet négligeable sur l'intellect", "Elle accroît la capacité de concentration", "Elle facilite le repérage dans l'espace", "Elle perturbe le raisonnement logique"],
    reponseCorrecte: 2, explication: "Les étudiants ont obtenu de meilleurs résultats à un test de localisation spatiale après avoir écouté Mozart, ce qui signifie que la sonate facilite le repérage dans l'espace."
  },
  {
    id: 38, niveau: "C2",
    texte: "Prévoir le Temps\nL'énorme masse de données météorologiques collectées tous les jours par les satellites est traitée par les plus gros ordinateurs du monde. Le résultat de ces calculs est fourni sous forme de cartes des vents, des pluies ou des températures. Ces cartes peuvent être animées par l'ordinateur, ce qui donne l'impression de se voir dérouler en accéléré les mouvements de l'atmosphère. Les ordinateurs font des calculs que le météorologue doit compléter. Au vu des informations, il prépare un scénario sur le temps le plus probable dans un, deux ou trois, voire dix jours dans certains centres.",
    question: "En quoi consiste la profession décrite ?",
    options: ["Concevoir des prévisions à court terme", "Élaborer des programmes de calcul", "Finaliser des animations visuelles", "Synthétiser les informations des satellites"],
    reponseCorrecte: 0, explication: "Le météorologue prépare un scénario sur le temps le plus probable dans les jours à venir, ce qui correspond à concevoir des prévisions à court terme."
  },
  {
    id: 39, niveau: "C2",
    texte: "Panache et arrogance, élégance et futilité, galanterie et gauloiserie : S'il existe, et à condition que cette notion ait encore un sens à l'ère de la mondialisation, l'esprit français tire son essence particulière du fragile équilibre entre ces oppositions. Amateur de grands principes, du coup de sang et de bons mots, c'est l'esprit français. Quoi que nous en disions, il nous obsède. Que nous exaltions le génie national ou l'exception culturelle, les racines ou l'universel, le particularisme local ou l'intérêt général, il ne s'agit toujours, au fond, que de lui. La mondialisation va-t-elle le dissoudre, et nous renvoyer au triste rang de pays ordinaire ?",
    question: "Selon l'auteur, qu'est-ce que l'esprit français ?",
    options: ["Des attitudes contradictoires forgeant une identité", "Un égocentrisme désuet au temps de la mondialisation", "Un ensemble de valeurs partagées par une élite", "Une aptitude à l'ouverture qui tend à disparaître"],
    reponseCorrecte: 0, explication: "L'auteur définit l'esprit français comme l'équilibre entre des oppositions (panache/arrogance, élégance/futilité), soit des attitudes contradictoires qui forgent une identité."
  },
];
