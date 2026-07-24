import type { QuestionCE } from "./types";

export const questionsSerie1: QuestionCE[] = [
  // --- NIVEAU A1 ---
  {
    id: 1, niveau: "A1",
    texte: "Maman.\nJe fais mes devoirs de mathématiques chez Louise.\nJe rentre à 21 heures.\nBises et à ce soir.\nPatrick",
    question: "Qu'est-ce que Patrick fait chez Louise ?",
    options: ["Il dort", "Il travaille", "Il joue", "Il mange"],
    reponseCorrecte: 1, explication: "Patrick écrit qu'il fait ses 'devoirs de mathématiques', ce qui correspond au fait de travailler."
  },
  {
    id: 2, niveau: "A1",
    texte: "Attention\nCette semaine, l'accueil de l'université est fermé lundi toute la journée et vendredi après-midi.",
    question: "À quoi sert cette affiche ?",
    options: ["Annoncer un changement", "Décrire un endroit", "Donner un rendez-vous", "Organiser une réunion"],
    reponseCorrecte: 0, explication: "Le mot 'Attention' et l'annonce d'une fermeture exceptionnelle 'Cette semaine' indiquent un changement temporaire d'horaires."
  },
  {
    id: 3, niveau: "A1",
    texte: "Aline, bonjour,\nC'est d'accord, RV avec les copines chez-moi le 30 avril pour déjeuner.\nBisous\nYvette",
    question: "Quelles sont les relations entre Aline et Yvette ?",
    options: ["Professionnelles", "Familiales", "Amicales", "Commerciales"],
    reponseCorrecte: 2, explication: "L'utilisation des termes 'copines', 'chez-moi' et 'Bisous' prouve qu'il s'agit d'une relation amicale."
  },
  {
    id: 4, niveau: "A1",
    texte: "Nous informons notre aimable clientèle que nous sommes actuellement en vacances jusqu'au dimanche 1er septembre. Nous aurons le plaisir de vous retrouver à partir du 2. Le magasin ouvrira comme tous les lundis à 11 h.\nBonnes vacances à tous",
    question: "Qu'apprend-on sur le magasin ?",
    options: ["Il va avoir de nouveaux horaires", "Il va changer de propriétaire", "Il va déménager en septembre", "Il va fermer pendant l'été"],
    reponseCorrecte: 3, explication: "Le texte dit 'nous sommes actuellement en vacances', ce qui signifie que le magasin est fermé pendant cette période estivale."
  },
  // --- NIVEAU A2 ---
  {
    id: 5, niveau: "A2",
    texte: "Salut Paul,\nJe t'écris du Canada. J'ai rencontré un étudiant mexicain. Je suis contente de parler ma langue avec lui, car l'Espagne me manque beaucoup ! En juin, nous suivons ensemble une formation en Italie. Je t'appelle bientôt.\nBisous, Elsa",
    question: "Quelle est la nationalité d'Elsa ?",
    options: ["Canadienne", "Espagnole", "Italienne", "Mexicaine"],
    reponseCorrecte: 1, explication: "Elsa écrit 'l'Espagne me manque beaucoup' et parle de 'sa langue' avec un Mexicain (qui parle espagnol), elle est donc Espagnole."
  },
  {
    id: 6, niveau: "A2",
    texte: "Nous avons prévu quelques réparations dans l'appartement à la fin de la semaine. Veuillez nous excuser pour le bruit.\nM. et Mme Garnier 7 avenue du Général Leclerc Appt. 307",
    question: "Qu'est-ce que M. et Mme Garnier écrivent à leurs voisins ?",
    options: ["Ils vont bientôt déménager", "Ils vont faire des travaux", "Ils vont organiser une soirée", "Ils vont recevoir de la visite"],
    reponseCorrecte: 1, explication: "Le terme 'réparations' et le fait de s'excuser pour le 'bruit' confirment qu'ils vont faire des travaux."
  },
  {
    id: 7, niveau: "A2",
    texte: "Chère Cathy,\nAprès six mois de travaux, Pierre et moi avons quitté la maison de ses parents et nous sommes enfin installés chez nous ! Nous fêtons l'évènement le dimanche 23 juin à partir de 19 h 30.\nJ'espère que tu pourras venir !\nLésa",
    question: "Qu'est-ce que Lésa va fêter ?",
    options: ["La retraite de ses parents", "Son anniversaire de mariage", "Un nouveau logement", "Une création d'entreprise"],
    reponseCorrecte: 2, explication: "Lésa annonce qu'ils sont 'enfin installés chez nous' après avoir quitté la maison des parents. C'est la fête d'un nouveau logement."
  },
  {
    id: 8, niveau: "A2",
    texte: "Un poste est libre dans votre association ?\nLe site www.place-publique.fr vous propose de publier une annonce. Envoyez-nous la description du poste, le salaire et vos coordonnées. Votre annonce sera visible pendant un mois.",
    question: "Que peuvent faire les associations sur ce site Internet ?",
    options: ["Offrir des emplois", "Participer à un forum", "Présenter leur action", "Trouver de l'argent"],
    reponseCorrecte: 0, explication: "Le site propose de publier une annonce pour un 'poste libre' avec un 'salaire', ce qui correspond à une offre d'emploi."
  },
  {
    id: 9, niveau: "A2",
    texte: "Madame,\nNous avons bien reçu votre demande de remboursement pour un billet de train (voyage professionnel). Vous nous avez envoyé le ticket de carte bancaire, mais nous avons aussi besoin d'une attestation de votre employeur. Merci de nous l'adresser par courrier postal ou sous format électronique.\nCordialement,\nLe service financier.",
    question: "Quel document doit fournir la femme ?",
    options: ["Un document professionnel.", "Un titre de transport.", "Une enveloppe timbrée", "Une somme d'argent."],
    reponseCorrecte: 0, explication: "Le service financier réclame une 'attestation de votre employeur', ce qui est un document professionnel."
  },
  {
    id: 10, niveau: "A2",
    texte: "Semaine du 6 au 10 septembre :\nLe restaurant universitaire vous propose des recettes régionales variées au tarif normal.\nRendez-vous de 11h15 à 13h dans la salle du premier étage.\nBon appétit !",
    question: "Que propose le restaurant du 6 au 10 septembre ?",
    options: ["Des cours de cuisine", "Des menus différents", "Des plats à emporter", "Des tickets bon marché"],
    reponseCorrecte: 1, explication: "L'affiche mentionne des 'recettes régionales variées', ce qui signifie des menus différents de d'habitude."
  },
  // --- NIVEAU B1 ---
  {
    id: 11, niveau: "B1",
    texte: "Vous voulez faire connaître votre entreprise ?\nNous vous proposons de très bons prix pour mettre une annonce sur notre site Internet. Envoyez-nous votre texte, nous vous contacterons pour vous informer sur nos prix.",
    question: "Que propose cette annonce aux entreprises ?",
    options: ["Un service de création de sites.", "Une aide informatique rapide.", "Une formation sur internet.", "Une publicité à faible coût."],
    reponseCorrecte: 3, explication: "'Mettre une annonce' correspond à de la publicité, et l'expression 'de très bons prix' signifie à faible coût."
  },
  {
    id: 12, niveau: "B1",
    texte: "La librairie des Orgues à Paris a récolté 9000 euros de ses clients afin de financer son déménagement. Un résultat inespéré qui a permis à la librairie de s'agrandir. Lors de l'inauguration, la libraire a offert un verre à ses généreux donateurs. En fonction du montant de leur participation, ils ont reçu un livre de leur choix ou ont obtenu le statut de client d'or, signifié par une plaque à leur nom sur le mobilier de la librairie.",
    question: "Pourquoi la librairie a-t-elle récolté de l'argent ?",
    options: ["Pour acheter des meubles de bibliothèque", "Pour organiser un concours de lecture", "Pour ouvrir un salon de thé littéraire", "Pour s'installer dans un local plus vaste"],
    reponseCorrecte: 3, explication: "Le texte précise que l'argent a servi à 'financer son déménagement' et a permis à la librairie de 's'agrandir' (un local plus vaste)."
  },
  {
    id: 13, niveau: "B1",
    texte: "Madame Guilbert,\nL'imprimante de mon bureau ne fonctionne pas. Mes consultations commencent demain à 14 h. Pourriez-vous commander rapidement du papier et de l'encre, s'il vous plaît ?\nMerci\nDocteur Philippe",
    question: "Que doit faire Madame Guilbert ?",
    options: ["Acheter du matériel", "Appeler un réparateur", "Imprimer un document", "Noter un rendez-vous"],
    reponseCorrecte: 0, explication: "Le docteur lui demande de 'commander... du papier et de l'encre', ce qui équivaut à acheter du matériel de bureau."
  },
  {
    id: 14, niveau: "B1",
    texte: "Cher Paul,\nJe suis désolée de t'avoir laissé sans nouvelle. Je pensais t'écrire de Fès, mais notre séjour ne s'est pas déroulé comme nous l'espérions. Nous avons passé trois nuits supplémentaires à Tanger à cause d'un problème technique sur une de nos lignes touristiques. Nous avons aussi annulé le rendez-vous prévu aujourd'hui avec notre client de Casablanca, car nous avons dû nous rendre à Marrakech pour régler les frais occasionnés par cet incident. Nous rentrons demain à Paris.\nBises\nMathilde",
    question: "Dans quelle ville se trouve Mathilde d'après cette lettre ?",
    options: ["Fès", "Casablanca", "Marrakech", "Tanger"],
    reponseCorrecte: 2, explication: "Elle explique qu'elle a quitté Tanger, annulé l'étape de Casablanca, et affirme 'nous avons dû nous rendre à Marrakech pour régler les frais'. Elle écrit donc depuis Marrakech."
  },
  {
    id: 15, niveau: "B1",
    texte: "Olivier Pollet, co-fondateur d'Escursia, veut développer le tourisme scientifique. C'est un tourisme permettant de découvrir et d'apprendre sur la nature, la faune et la flore, au cours de treks ou de randonnées guidées par des accompagnateurs scientifiques professionnels désirant faire partager leurs connaissances. Ces séjours sont ouverts à tous les publics et pour y prendre part, il ne faut pas nécessairement disposer d'une excellente condition physique, il faut juste une pointe de curiosité et le sens de l'observation.",
    question: "Quelle est la particularité du tourisme scientifique ?",
    options: ["Il fait observer la nature de façon différente", "Il aide au développement de la recherche", "Il nécessite un bon entrainement sportif", "Il s'adresse à des spécialistes passionnés"],
    reponseCorrecte: 0, explication: "Ce tourisme permet 'd'apprendre sur la nature... guidées par des accompagnateurs scientifiques', ce qui offre une manière différente (plus pointue et observatrice) d'aborder la nature."
  },
  {
    id: 16, niveau: "B1",
    texte: "Les gardes-chasse d'Orly ont lancé une campagne de capture des lapins vivant sur l'aéroport, afin de les expatrier vers le sud de la France, dont la faune et la flore ont été dévastées par les grands incendies de l'été dernier. Le lapin élevé au kérosène va donc se refaire une santé auprès des romarins et des thyms de Provence. On connaît des riverains qui aimeraient bien être des petits lapins !",
    question: "Qu'est-il arrivé aux lapins de l'aéroport d'Orly ?",
    options: ["On les a tués afin de les manger", "On les a attrapés et emmenés ailleurs", "On les a chassés de l'aéroport", "On les a soignés et relâchés"],
    reponseCorrecte: 1, explication: "Le texte parle de 'capture' (attrapés) et du fait de les 'expatrier vers le sud' (emmenés ailleurs)."
  },
  {
    id: 17, niveau: "B1",
    texte: "Il y a beaucoup d'avantages démontrés par les faits à choisir la Suisse pour y effectuer ses études ou une partie de celles-ci. La qualité de vie, celle des formations dispensées même si elles sont souvent chères, la situation géographique et l'ouverture internationale du pays... Du côté des défauts, mentionnons le fait que toutes les filières et formations ne sont pas représentées, ce qui est le cas dans la plupart des petits pays.",
    question: "Quel avantage présente l'enseignement supérieur dans ce pays ?",
    options: ["Le choix des matières est vaste.", "Le nombre d'étudiants est limité.", "Le prix des études est peu élevé.", "L'enseignement est d'un bon niveau."],
    reponseCorrecte: 3, explication: "L'auteur vante 'la qualité... des formations dispensées', ce qui correspond à un enseignement d'un bon niveau."
  },
  {
    id: 18, niveau: "B1",
    texte: "On croyait leur métier en voie de disparition et pourtant le nombre de secrétaires a doublé en vingt ans. Ceux qui avaient dit que l'informatique les remplacerait se sont trompés. Au contraire, elles n'ont jamais été aussi recherchées. Leurs tâches classiques ont tendance à diminuer au profit de nouvelles responsabilités. Elles sont de moins en moins rattachées à une seule personne, mais à une équipe. Toutefois, malgré l'importance qu'elles ont prise, elles souffrent toujours d'un certain manque de reconnaissance",
    question: "Aujourd'hui, quel est l'inconvénient du métier de secrétaire ?",
    options: ["La quantité de travail est importante", "Le rôle est peu valorisé", "Les postes sont supprimés", "Les tâches sont limitées"],
    reponseCorrecte: 1, explication: "Le texte conclut en disant qu'elles 'souffrent toujours d'un certain manque de reconnaissance', ce qui signifie que le métier est peu valorisé."
  },
  {
    id: 19, niveau: "B1",
    texte: "L'anglais est arrivé au vingtième siècle, à la première place du palmarès des langues internationales. Près de la moitié de l'humanité est concernée par cette langue, car elle est quasi obligatoire dans de nombreux secteurs d'activité. Pourtant, cette situation a des limites et l'anglais devra faire face à la progression d'autres langues dans les années à venir. Les raisons sont la montée en puissance économique et industrielle de grands pays émergents, le développement d'échanges régionaux et ceux entre pays voisins.",
    question: "Que dit-on de la langue anglaise dans cet article ?",
    options: ["Elle doit devenir la langue de l'administration publique", "Elle peut perdre son statut de langue dominante", "Elle restera la langue privilégiée dans le commerce", "Elle va provoquer la disparition de langues minoritaires"],
    reponseCorrecte: 1, explication: "Le texte précise que 'cette situation a des limites et l'anglais devra faire face à la progression d'autres langues', suggérant qu'elle peut perdre son monopole (statut dominant)."
  },
  // --- NIVEAU B2 ---
  {
    id: 20, niveau: "B2",
    texte: "Job d'été, la première expérience\nQuand une entreprise fait appel pour la première fois à un jeune, elle n'a pas d'attente vis-à-vis de ses compétences professionnelles, c'est donc sur son comportement que vont se porter ses critères d'évaluation. Même saisonnier. Il faut montrer qu'on a vraiment envie de décrocher un job. Les jeunes sans expérience ont tout intérêt à parler de leur passion et à démontrer leur motivation. Pour un employeur, c'est ce qui reste souvent le critère le plus important.",
    question: "Selon l'article, que faut-il faire pour trouver un job d'été ?",
    options: ["Exposer l'ensemble de ses qualités professionnelles", "Faire la preuve de son désir de travailler", "Parler avec enthousiasme de ses projets de formation", "Parler des emplois qu'on a déjà occupés"],
    reponseCorrecte: 1, explication: "L'article insiste sur le fait de 'montrer qu'on a vraiment envie' et de 'démontrer leur motivation', ce qui revient à faire preuve de son désir de travailler."
  },
  {
    id: 21, niveau: "B2",
    texte: "Le jour viendra où un fonds de pension ou un groupe alimentaire mondial investira dans l'entreprise d'un cuisinier reconnu pour orchestrer son développement international. Bien sûr, on ne peut qu'avoir de la nostalgie pour les temps héroïques ou une bande de copains inventait les codes de la nouvelle cuisine. Aujourd'hui, n'importe quel jeune cuisinier est prêt à payer très cher pour le privilège d'un stage de six mois chez un « Grand chef ». Il rentabilisera vite cet investissement en s'autoproclamant élève de, car les marques des grands chefs ne cessent de prendre de la valeur.",
    question: "Qu'apprend-on sur les grands chefs ?",
    options: ["Leur conception de la cuisine est passée de mode.", "Leur créativité leur assure une célébrité mondiale.", "Leur nom s'est transformé en label de prestige.", "Leurs établissements sont cotés en bourse."],
    reponseCorrecte: 2, explication: "Le texte précise que 'les marques des grands chefs ne cessent de prendre de la valeur' et que les jeunes paient pour s'autoproclamer de leur école, prouvant que leur nom est un label de prestige."
  },
  {
    id: 22, niveau: "B2",
    texte: "Non, Maupassant n'est pas qu'un écrivain pour cours de français. Comme tout bon auteur culte, ses thématiques sont percutantes, grinçantes, toujours d'actualité. Et tellement vraies dans le fond : hypocrisie de la bourgeoisie, monde paysan décrit sans artifice, rapports humains aliénés par le contexte social et culturel... Du pain bénit pour les auteurs de « Chez Maupassant », une collection de huit téléfilms tirés des contes et nouvelles du grand Guy.",
    question: "Que présente l'auteur de l'article ?",
    options: ["Des adaptations télévisées de Maupassant", "Des programmes d'études littéraires", "Une exposition consacrée à Maupassant", "Un ouvrage critique récemment paru"],
    reponseCorrecte: 0, explication: "L'auteur parle d'une 'collection de huit téléfilms tirés des contes et nouvelles', ce qui correspond à des adaptations télévisées."
  },
  {
    id: 23, niveau: "B2",
    texte: "Elle devait être démolie et un nouveau lieu de culte reconstruit à l'arrière de l'église actuelle, le long du boulevard. Le projet, qui prévoyait la restructuration complète de l'îlot avec la création de logements sociaux, ne verra finalement pas le jour. La Ville et le diocèse ont pris la décision de conserver l'église Sainte-Madeleine considérant avec certains experts que sa démolition aurait causé la perte regrettable d'un élément important du patrimoine nantais. Des travaux d'urgence vont être réalisés avant le lancement d'un véritable programme de restauration et de mise en valeur du bâtiment.",
    question: "Selon cet article, quelle décision a été prise ?",
    options: ["Bâtir une église identique dans le quartier", "Débuter le réaménagement du boulevard", "Entreprendre une rénovation du lieu", "Réhabiliter les logements sociaux existants"],
    reponseCorrecte: 2, explication: "Le texte annonce la 'décision de conserver l'église' et le lancement d'un 'programme de restauration et de mise en valeur du bâtiment' (rénovation)."
  },
  {
    id: 24, niveau: "B2",
    texte: "L'insecte pourrait devenir une solution économique à notre appétit de protéines. Vous attrapez trois grillons déshydratés et les enfournez dans votre bouche : vous voilà mangeur d'insectes. Vous contribuez à la préservation des ressources. En effet, il faut 10 kg de céréales pour produire 1 kg de bœuf ou 9 kg d'insectes. La demande mondiale de protéines va doubler et les insectes, c'est riche en protéines. Depuis l'an dernier, la communauté européenne subventionne les projets de recherche dans ce secteur. Les grands groupes alimentaires s'intéressent au sujet, mais attendent que les citoyens soient psychologiquement prêts.",
    question: "Qu'apprend-on sur la production d'insectes ?",
    options: ["C'est une réponse à des besoins alimentaires accrus", "Des recherches remettent en cause l'intérêt nutritif", "Elle s'avère moins rentable que les cultures de céréales", "Les citoyens exigent des garanties sanitaires"],
    reponseCorrecte: 0, explication: "Le texte indique que 'la demande mondiale de protéines va doubler' et que l'insecte, riche en protéines, est une solution pour y répondre."
  },
  {
    id: 25, niveau: "B2",
    texte: "Ces dernières années, les nouvelles versions de films à succès se sont multipliées et ce mouvement ne semble pas près de s'arrêter, comme si l'industrie cinématographique ne parvenait plus à inventer de nouvelles histoires, de nouveaux concepts qui pourraient éveiller la curiosité d'un large public. Pourtant, de nouvelles idées, de nouvelles sensibilités, il y en aura toujours, encore faut-il qu'elles trouvent un relais financier pour voir le jour. Et l'industrie cinématographique hésite à investir dans du « neuf », alors elle se tourne vers les valeurs sûres des succès passés.",
    question: "Quelle constatation ce journaliste fait-il sur le cinéma contemporain ?",
    options: ["Les producteurs évitent de prendre des risques.", "Les réalisateurs sont à la recherche d'idées neuves.", "Les scénaristes font preuve d'une imagination limitée.", "Les spectateurs privilégient les créations classiques."],
    reponseCorrecte: 0, explication: "Le journaliste affirme que 'l'industrie cinématographique hésite à investir dans du « neuf », alors elle se tourne vers les valeurs sûres', évitant ainsi le risque financier."
  },
  {
    id: 26, niveau: "B2",
    texte: "Le droit à l'oubli sur internet est fondamental. Aujourd'hui, internet nous expose à des risques, en mettant à portée d'institutions ou d'entreprises des informations personnelles que nous avons oubliées ou que nous souhaitons oublier. Or l'oubli, autant que la mémoire, est essentiel à l'humain pour être capable d'agir et de fonctionner dans le présent. Un spécialiste de la question propose une solution. Si les gens ont envie de sauvegarder des informations les concernant, ils y attacheront une date d'expiration. Les citoyens doivent choisir eux-mêmes ce qui de leurs informations personnelles, sera retenu ou effacé, cela ne doit pas résulter du choix de grosses sociétés ou de gouvernements.",
    question: "Pourquoi le droit à l'oubli sur internet est-il important ?",
    options: ["Pour aider à faire le deuil du passé", "Pour alléger le stockage des données", "Pour faire obstacle aux multinationales", "Pour rester maître de sa vie privée"],
    reponseCorrecte: 3, explication: "Le texte affirme que 'les citoyens doivent choisir eux-mêmes' ce qui sera retenu ou effacé de leurs informations personnelles, ce qui correspond à la nécessité de rester maître de sa vie privée."
  },
  {
    id: 27, niveau: "B2",
    texte: "Une étude récente révèle que la concentration de déchets plastiques flottant à la surface du pacifique nord a été multipliée par cent en quarante ans. Ce constat, émis par les pêcheurs en haute mer, est alarmant, car cette pollution a des conséquences écologiques. La gigantesque plaque de déchets flottant sur l'océan pacifique, épais par endroits de plusieurs dizaines de mètres, constitue un milieu favorable à la reproduction d'une espèce d'araignée d'eau. Cet insecte est en train de se multiplier dans le pacifique nord. Si la densité des plastiques continue à augmenter, certaines espèces pourraient continuer à se multiplier, risquant de déséquilibrer l'écosystème du Pacifique.",
    question: "Quel danger représente ces déchets ?",
    options: ["Un obstacle pour les bateaux de pêche.", "Un réchauffement dramatique des eaux.", "Un risque d'intoxication des populations du Pacifique.", "Une diminution de la diversité de la faune océanique."],
    reponseCorrecte: 3, explication: "Le texte indique que la prolifération d'une seule espèce (l'araignée d'eau) risque de 'déséquilibrer l'écosystème'. Un déséquilibre écologique dû à la prolifération d'une espèce entraîne inévitablement une menace et une diminution de la diversité des autres espèces (la faune océanique)."
  },
  {
    id: 28, niveau: "B2",
    texte: "Les jeunes du lycée professionnel hôtelier Paul-Valéry ont des idées. Afin de pallier la faiblesse des moyens de l'Éducation nationale pour financer leurs voyages d'études, ils n'arrêtent pas de mobiliser les bonnes volontés à coups d'initiatives originales et qui font mouche. Après l'exemple donné par les terminales de restauration qui proposent un repas « tout citron » pour un voyage d'études à Barcelone, c'est au tour des élèves de 2nde de battre le rappel. Ceux-ci bénéficieront des retombées d'un vide grenier, organisé par le Lions club, pour boucler le budget de leur voyage d'études en Corse à la rentrée.",
    question: "Quel est l'objectif des élèves de 2nde ?",
    options: ["Élaborer le budget de leur voyage à Barcelone", "Gagner de l'argent pour payer leur séjour", "Montrer aux autres classes leurs talents culinaires", "Soutenir le futur projet des élèves de terminale"],
    reponseCorrecte: 1, explication: "Le texte précise que les élèves de 2nde organisent cela 'pour boucler le budget de leur voyage d'études en Corse', ce qui signifie trouver les financements (gagner de l'argent) pour payer leur propre séjour."
  },
  {
    id: 29, niveau: "B2",
    texte: "Les gens empilaient les objets dans les chariots de métal, avec frénésie. Ils avaient des visages sérieux, contractés, et leurs paupières battaient de façon anormalement lente. Les femmes tendaient les mains vers les étals. On aurait dit que les gens ne savaient plus ce qu'ils faisaient. Comment l'auraient-ils su ? Ce n'étaient pas eux qui saisissaient la marchandise. C'est la marchandise qui se collait d'elle-même à leurs mains, elle entrait directement dans les caddies. La nourriture n'était plus que des formes, des couleurs. Les yeux dévoraient les couleurs rouge, blanche, verte, orange, les yeux avaient faim de sphères et de pyramides, faim de plastiques lisses et de capsules de fer-blanc.",
    question: "Dans cet extrait, qu'apprend-on sur les acheteurs ?",
    options: ["Ils donnent l'impression de vénérer les produits.", "Ils ont l'air éblouis par le gigantisme des magasins.", "Ils paraissent manipulés par une force supérieure", "Ils semblent perdus dans le labyrinthe des rayons"],
    reponseCorrecte: 2, explication: "Le narrateur décrit une scène presque irréelle où 'les gens ne savaient plus ce qu'ils faisaient' et 'ce n'étaient pas eux qui saisissaient la marchandise'. Ils semblent hypnotisés, comme manipulés par une force extérieure ou supérieure (la marchandise elle-même)."
  },
  // --- NIVEAU C1 ---
  {
    id: 30, niveau: "C1",
    texte: "L'engouement pour les régimes dits « détox » s'inscrit dans une logique de purification qui relève davantage du dogme que de la science. La promesse d'éliminer les toxines accumulées par l'organisme séduit un public en quête de contrôle sur sa santé. Pourtant, le corps humain, grâce au foie et aux reins, dispose déjà d'un système d'épuration autonome redoutablement efficace, rendant ces cures souvent inutiles, voire dangereuses en cas de carences prolongées.",
    question: "Que pense l'auteur des régimes « détox » ?",
    options: ["Ils sont nécessaires pour aider le foie et les reins.", "Ils répondent à un besoin médical scientifiquement prouvé.", "Ils sont illusoires car le corps se nettoie naturellement.", "Ils doivent être suivis uniquement en cas de carences."],
    reponseCorrecte: 2, explication: "L'auteur affirme que cela relève 'davantage du dogme que de la science' et rappelle que le corps humain 'dispose déjà d'un système d'épuration autonome redoutablement efficace'."
  },
  {
    id: 31, niveau: "C1",
    texte: "Solitude, conflit avec les parents, difficultés scolaires... Les adolescents peuvent se confier sur des sites spécialisés où leur parole sera prise en compte. Fil Santé jeune a vu ses visites augmenter de 313 % ces dernières années. De l'autre côté de l'écran, animateurs et psychologues s'efforcent de maintenir le contact et de prolonger la discussion. L'entreprise est délicate puisque les regards et les gestes ne peuvent être pris en compte par le professionnel. Le réconfort nait aussi, et peut-être avant tout, des autres internautes qui vivent une situation similaire.",
    question: "À quelle difficulté se heurtent les spécialistes ?",
    options: ["L'absence totale des signes visuels du langage", "L'opposition des familles à leurs interventions", "La nécessité de modérer le ton des échanges", "Les nombreuses remarques des participants"],
    reponseCorrecte: 0, explication: "Le texte indique que 'l'entreprise est délicate puisque les regards et les gestes ne peuvent être pris en compte', ce qui correspond exactement à l'absence de signes visuels lors de ces échanges en ligne."
  },
  {
    id: 32, niveau: "C1",
    texte: "Méthode originale, la psychologie narrative propose les clés d'un nouvel art de vivre pour renoncer définitivement aux comportements susceptibles de brider notre propension au bonheur ! Cette pratique, loin de vanter le bienfait de vaines chimères, repose sur une prise de conscience : celle que le monde tel que je le pense n'est pas tel que je le vis. Le travestissement de la réalité est incessant. Il y a d'un côté la réalité des faits, et de l'autre, ma représentation, explique Yves Alexandre Thalmann. Avec notre cerveau, nous passons notre temps à organiser les liens de cause à effet de façon à ce que ça prenne une signification à nos yeux. Or, selon le psychologue, la manière dont nous appréhendons les choses détermine davantage notre qualité de vie que les événements eux-mêmes. À ce titre, nos représentations mentales ont donc la capacité de nous procurer une vie plus agréable.",
    question: "Comment la perception des événements permet-elle d'accéder au bonheur ?",
    options: ["Si on les prend en compte avec lucidité", "Si on les remodèle à travers l'imagination", "Si on modifie la façon dont on les perçoit", "Si on recherche leur signification profonde"],
    reponseCorrecte: 2, explication: "Le psychologue affirme que c'est 'la manière dont nous appréhendons les choses' et 'nos représentations mentales' qui déterminent la qualité de vie, ce qui implique que modifier notre perception (notre représentation) permet d'accéder au bonheur."
  },
  {
    id: 33, niveau: "C1",
    texte: "<< Le Fait du Roi >>\nun roman d'A. Thonon.\nC'est l'histoire d'un homme qui prend l'identité d'un autre, mort, en se glissant dans sa peau, dans sa vie, dans sa maison... Rien ne sert de raconter l'intrigue de ce roman tant elle est simple et sans surprise. L'écriture de l'auteur reste cependant toujours aussi piquante et agréable à lire. Le héros principal, quant à lui, est dépeint avec une certaine profondeur.",
    question: "Sur quel point porte la critique négative faite à ce livre ?",
    options: ["La description du personnage", "La longueur du texte", "La qualité de l'écriture", "Le déroulement des évènements"],
    reponseCorrecte: 3, explication: "Le critique souligne que 'l'intrigue de ce roman... est simple et sans surprise', ce qui correspond au déroulement prévisible des événements. Les autres aspects (personnage, écriture) sont complimentés."
  },
  {
    id: 34, niveau: "C1",
    texte: "Monsieur et Madame Martin n'ont pas un emploi du temps également captivant. Quand Monsieur se rend au travail, Madame manie l'aspirateur. Quand il est au bureau, elle achète des surgelés au supermarché. Quand il se cale devant la télé, l'épouse modèle se colle aux fourneaux. Une illustration exhumée d'un manuel des années 1950 ? Non, les images d'un exercice pour une classe de CP afin de « comprendre la simultanéité » en étudiant les moments de la journée d'une famille. Quand Virginie Sassoon est tombée sur ce document ultra-stéréotypé dans le classeur de sa fille, cette maman est tombée des nues. « Cette fiche dévoile une forme de violence symbolique qui persiste dans notre société et qui relève selon moi, de la responsabilité collective. »",
    question: "Pourquoi Virginie Sassoon est-elle choquée par les exercices proposés dans la classe de sa fille ?",
    options: ["Ils correspondent à des programmes scolaires obsolètes", "Ils méconnaissent l'existence des familles recomposées", "Ils présentent un partage sexiste des tâches dans le couple", "Ils se moquent du quotidien des personnes sans emploi"],
    reponseCorrecte: 2, explication: "Le document est qualifié d''ultra-stéréotypé' car il montre systématiquement l'homme au travail ou au repos devant la télévision, tandis que la femme est cantonnée aux tâches ménagères, illustrant une division sexiste."
  },
  {
    id: 35, niveau: "C1",
    texte: "Des chercheurs mettent en doute l'idée répandue, que la langue que nous parlons influence notre façon de penser. Ils présentent une recherche sur l'ordre des mots dans la phrase : Sujet, Verbe, Objet pour certaines langues ; Sujet, Objet, Verbe pour d'autres. Leurs 40 sujets, locuteurs d'anglais, d'espagnol, de mandarin, de turc, ont décrit des séquences vidéo dans leur langue d'abord, puis en utilisant des gestes. Si les descriptions verbales différaient dans l'ordre des mots selon les langues, les descriptions faites avec les mains reprenaient toutes le même ordre (sujet, objet, verbe), suivant celui des langues des signes inventées par des locuteurs sourds.",
    question: "Quel est le résultat de l'expérience présentée dans cet article ?",
    options: ["Les gestes révèleraient systématiquement la langue maternelle des locuteurs", "Il existerait un ordre universel de la pensée, indépendant de l'ordre linguistique", "Il y aurait autant de façons de penser que de structures de langue différentes", "Les structures des langues seraient dépendantes de notre expérience du monde"],
    reponseCorrecte: 1, explication: "L'expérience montre que malgré des structures de phrases différentes selon la langue maternelle, tous les locuteurs utilisent spontanément le même ordre lorsqu'ils font des gestes, suggérant un ordre de pensée universel."
  },
  // --- NIVEAU C2 ---
  {
    id: 36, niveau: "C2",
    texte: "Sexistes, les jeux vidéo ? Peut-être que oui, peut être que non. En tout cas, à parcourir les allées de la Paris Games Week, l'œil avisé aura lui-même bien du mal à trouver un personnage principal féminin de jeu vidéo. Il y a bien la célébrissime Lara Croft du jeu vidéo Tomb Raider, aux attributs particulièrement imposants, conçus presque sur mesure pour plaire aux masculins. Pour le reste, circulez, il n'y a presque rien d'autre à voir, si l'on balaye d'un coup de manette de jeu, au mieux, les princesses à sauver, au pire, les call-girls de mafioso. Pourtant, l'industrie du jeu vidéo a pris conscience ces dernières années du potentiel du marché des joueuses.",
    question: "Quel constat est dressé sur les jeux vidéo ?",
    options: ["La quasi-absence d'héroïnes", "L'appel constant à la violence", "L'atténuation des clichés", "L'uniformité des scénarios"],
    reponseCorrecte: 0, explication: "L'auteur souligne qu'il est très difficile de trouver un 'personnage principal féminin' et qu'à part quelques exceptions très stéréotypées, 'il n'y a presque rien d'autre à voir', ce qui correspond à une quasi-absence d'héroïnes."
  },
  {
    id: 37, niveau: "C2",
    texte: "Les technologies de l'information et de la communication (TIC) sont de plus en plus utilisées et adoptées de façon variable par les établissements d'enseignement supérieur à travers le monde. Les TIC apparaissent autant comme une prestation en présence sur le campus que comme un enseignement ouvert et à distance. Les actions de l'UNESCO se concentrent sur l'aide aux États membres afin de développer des politiques durables dans le domaine des TIC dans l'enseignement supérieur. Les plans d'action et les investissements positifs en matière de TIC sont clairement bénéfiques pour les institutions d'enseignement supérieur (IES), même si les TIC n'ont pas remplacé les modes d'apprentissage ou d'enseignement classiques telles que les salles de classe.",
    question: "Pourquoi peut-on dire que l'UNESCO est active dans le domaine des TIC ?",
    options: ["Parce qu'elle finance les programmes de développement des TIC", "Parce qu'elle organise des débats entre États membres sur les TIC", "Parce qu'elle sensibilise les établissements d'enseignement aux TIC", "Parce qu'elle habilite des formateurs à l'utilisation des TIC"],
    reponseCorrecte: 2, explication: "Le texte précise que 'Les actions de l'UNESCO se concentrent sur l'aide aux États membres afin de développer des politiques durables', ce qui constitue un travail d'accompagnement et de sensibilisation pour inciter les établissements à intégrer ces technologies."
  },
  {
    id: 38, niveau: "C2",
    texte: "Travailler avec son mari ou son petit ami, sa sœur ou sa mère n'est pas une punition pour tout le monde ! Pour certains, c'est même la condition du bien être professionnel. Si cette idée évoquait jadis une petite entreprise conservatrice, transmise de père en fils, aujourd'hui, travailler en famille relève de réalités très différentes. Critères retenus : confiance, valeurs et goûts communs ; et surtout, besoin de réaliser ses projets plutôt que ceux des autres. Depuis toujours, la majorité des entreprises en France, toutes tailles confondues, sont familiales ; et de plus en plus de créations sont le fait de femmes. Ce sont d'ailleurs des entreprises où l'on vit mieux et qui durent plus longtemps que les autres. Aujourd'hui, la création d'une entreprise est plus souvent motivée par le désir d'assurer un travail à ses enfants ou d'échapper à des structures jugées déshumanisantes.",
    question: "Que permet la structure d'entreprise présentée ?",
    options: ["De concrétiser des objectifs personnels", "De fonctionner dans un cadre innovant", "De limiter la répartition des gains", "De renforcer les liens entre les générations"],
    reponseCorrecte: 0, explication: "Le texte mentionne que travailler en famille répond au 'besoin de réaliser ses projets plutôt que ceux des autres' et au désir 'd'échapper à des structures jugées déshumanisantes', ce qui permet de concrétiser des objectifs personnels."
  },
  {
    id: 39, niveau: "C2",
    texte: "Le contrôle, en toute matière, aboutit à pervertir l'action... Dès qu'une action est soumise à un contrôle, le but profond de celui qui agit n'est plus l'action, mais la prévision du contrôle, la mise en échec des moyens de contrôle. Le contrôle des études n'est qu'un cas particulier et une démonstration éclatante de cette observation très générale. Le diplôme donne à la société un fantôme de garantie, et aux diplômés des fantômes de droits. Le diplômé passe officiellement pour détenir un savoir : il garde toute sa vie ce brevet d'une science momentanée. C'est pour accéder au diplôme qu'on a vu se substituer à la lecture des auteurs, l'usage des résumés, des manuels, des recueils de questions et de réponses toutes faites et autres abominations.",
    question: "Que soutient l'auteur de ce texte à propos du contrôle ?",
    options: ["Il contribue à améliorer les méthodes d'apprentissage", "Il est indispensable pour accéder au monde professionnel", "Il permet de certifier les compétences réelles d'un candidat", "Il perturbe le processus d'acquisition des connaissances"],
    reponseCorrecte: 3, explication: "L'auteur affirme que le contrôle 'aboutit à pervertir l'action' et qu'il pousse les étudiants à utiliser des 'résumés' et des 'réponses toutes faites' au lieu de lire véritablement les auteurs, ce qui perturbe et dégrade l'acquisition réelle des connaissances."
  }
];
