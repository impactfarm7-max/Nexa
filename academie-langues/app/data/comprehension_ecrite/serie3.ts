import type { QuestionCE } from "./types";

export const questionsSerie3: QuestionCE[] = [
  // --- NIVEAU A1 ---
  {
    id: 1, niveau: "A1",
    texte: "Chers Amis,\nNous sommes heureux de vous annoncer l'arrivée d'un nouveau membre dans notre famille. Il se nomme Adrien et a vu le jour le 1er septembre au matin.\nBien à vous.",
    question: "De quel événement s'agit-il ?",
    options: ["D'un anniversaire", "D'un décès", "D'un mariage", "D'une naissance"],
    reponseCorrecte: 3, explication: "Le message annonce la naissance d'un bébé prénommé Adrien, né le 1er septembre au matin."
  },
  {
    id: 2, niveau: "A1",
    texte: "Chère Julie,\nJe reste à la maison aujourd'hui. Je suis fatiguée après mon long voyage. Rémi passera me voir demain matin.\nBises,\nSophie",
    question: "Que fait Sophie aujourd'hui ?",
    options: ["Elle étudie son français", "Elle invite son ami Rémi", "Elle reste chez elle", "Elle va à la bibliothèque"],
    reponseCorrecte: 2, explication: "Sophie écrit 'Je reste à la maison aujourd'hui', ce qui indique clairement qu'elle reste chez elle."
  },
  {
    id: 3, niveau: "A1",
    texte: "Thomas,\nJe t'invite à aller voir un film ce samedi. Fred viendra aussi. On pourrait dîner au restaurant après la séance.\nÀ bientôt,\nAlex",
    question: "Que propose Alex à Thomas ?",
    options: ["Aller voir un film", "Dîner avec Fred", "Passer chez un ami", "Rester au travail"],
    reponseCorrecte: 0, explication: "Alex invite Thomas à aller voir un film samedi soir. Le dîner est prévu après, donc la proposition principale est le cinéma."
  },
  {
    id: 4, niveau: "A1",
    texte: "SAMEDI\nMarthe : 12h–13h : Cours de natation\nDjamel : 11h–13h : Révision avec Claire\n\nDIMANCHE\nMarthe : 8h–9h : Course avec Claire\nDjamel : 14h–18h : Répétition avec le groupe",
    question: "Que fait Marthe le samedi à 12 heures ?",
    options: ["Elle chante", "Elle court", "Elle étudie", "Elle nage"],
    reponseCorrecte: 3, explication: "Le planning indique que Marthe a 'Cours de natation' de 12h à 13h le samedi. La natation correspond à nager."
  },
  // --- NIVEAU A2 ---
  {
    id: 5, niveau: "A2",
    texte: "Une société de production RECHERCHE\nPour faire de la FIGURATION dans un film sur le thème parents/enfants, de jeunes mères confrontées à l'éducation de leurs enfants.",
    question: "Que recherche la société de production ?",
    options: ["De jeunes enfants", "Des femmes et des enfants", "De jeunes mamans", "Des parents avec leurs enfants"],
    reponseCorrecte: 2, explication: "L'annonce précise qu'elle cherche 'de jeunes mères', ce qui correspond à de jeunes mamans."
  },
  {
    id: 6, niveau: "A2",
    texte: "À Héloïse\nHéloïse, quand tu viendras chez moi, pense à prendre des vêtements chauds. À la montagne, en hiver, il fait très froid. Je t'envoie les horaires du bus par SMS. Appelle-moi ce soir quand tu rentres du travail. Vivement les vacances !\nBises,\nSam",
    question: "Que doit faire Héloïse ?",
    options: ["Bien choisir ses vêtements", "Chercher les horaires du bus", "Envoyer un courriel à Sam", "Trouver une location de vacances"],
    reponseCorrecte: 0, explication: "Sam conseille à Héloïse de 'prendre des vêtements chauds' car il fait très froid à la montagne, ce qui correspond à bien choisir ses vêtements."
  },
  {
    id: 7, niveau: "A2",
    texte: "Salut Samira,\nLa fête du cinéma commence samedi prochain, ça t'intéresse ? Viens chez moi après le travail vendredi, on choisira ce qu'on ira voir samedi ou dimanche. Réponds-moi vite !\nLali",
    question: "Que veut faire Lali ?",
    options: ["Aller à un anniversaire", "Dîner avec son amie", "Partir en week-end", "Regarder des films"],
    reponseCorrecte: 3, explication: "Lali invite Samira à profiter de la fête du cinéma pour aller voir des films ensemble le week-end."
  },
  {
    id: 8, niveau: "A2",
    texte: "ÉCOLE FERRANDI\nLes parents peuvent venir chercher leurs enfants après les cours du matin et du soir sauf si les enfants mangent à l'école ou s'ils font des activités après la classe. Tous les enfants doivent avoir quitté l'école à 18h.\nP. Guignoux",
    question: "De quoi parle le directeur ?",
    options: ["De l'inscription des élèves", "Des horaires de sortie", "Des repas à la cantine", "Du temps de repos"],
    reponseCorrecte: 1, explication: "Le message précise à quelles heures les parents peuvent récupérer leurs enfants et qu'ils doivent partir avant 18h, ce qui correspond aux horaires de sortie."
  },
  {
    id: 9, niveau: "A2",
    texte: "Que puis-je dire de ce documentaire, moi qui pleure depuis tant d'années sur le manque de saveur de ce que je mange ? Je me rappelle du bon goût des pêches et des abricots. Je comprends mieux la majorité des agriculteurs : ils ne mangeraient pas ce qu'ils vendent, c'est fou ! J'ai apprécié avoir le point de vue des différentes personnes concernées : agriculteurs, consommateurs, enseignants, cuisiniers.",
    question: "Quel est le thème du documentaire ?",
    options: ["L'alimentation", "L'éducation", "La cuisine", "Le commerce"],
    reponseCorrecte: 0, explication: "Le documentaire traite du goût des aliments, du rôle des agriculteurs et de la chaîne alimentaire, ce qui correspond au thème de l'alimentation."
  },
  {
    id: 10, niveau: "A2",
    texte: "Vous aimez partager vos photos de voyage ?\nRejoignez notre communauté en ligne ! Chaque semaine, nos membres envoient leurs meilleures photos sur notre plateforme. Les plus belles sont publiées sur notre site et partagées avec des milliers d'abonnés dans le monde entier.\nInscription gratuite sur notre site.",
    question: "En quoi consiste l'activité principale de cette communauté ?",
    options: ["D'envoyer des photos", "D'inventer une recette", "De créer un spectacle", "De découvrir une langue"],
    reponseCorrecte: 0, explication: "Le texte précise que les membres 'envoient leurs meilleures photos sur notre plateforme' chaque semaine, ce qui constitue l'activité principale."
  },
  // --- NIVEAU B1 ---
  {
    id: 11, niveau: "B1",
    texte: "L'école Jean Monnet organise sa « Journée Portes Ouvertes » samedi prochain, de 9h00 à 16h00. Tous les parents d'élèves sont invités. Ce sera l'occasion de rencontrer les professeurs et l'équipe administrative qui se tiennent prêts à répondre à vos questions.\nLa direction de l'école J. Monnet",
    question: "Que pourront faire les parents pendant cette journée ?",
    options: ["Dialoguer avec le personnel enseignant", "Écouter une présentation du directeur", "Participer à une conférence sur l'éducation", "Répondre à un questionnaire sur les cours"],
    reponseCorrecte: 0, explication: "Le texte indique que les professeurs 'se tiennent prêts à répondre à vos questions', ce qui correspond à dialoguer avec le personnel enseignant."
  },
  {
    id: 12, niveau: "B1",
    texte: "On savait déjà que le chocolat était bon pour la tension. Les scientifiques affirment maintenant qu'une consommation de chocolat pourrait être une stratégie efficace de protection contre les rayons du soleil. Pour cela, il n'est pas nécessaire de recouvrir son corps de cacao : d'après les chercheurs, il suffirait de consommer trois carrés par jour pour bénéficier des bienfaits du chocolat. Cela n'empêche pas de se protéger avec de la crème solaire et d'avoir une bonne alimentation.",
    question: "Que conseillent ces chercheurs pour se protéger du soleil ?",
    options: ["D'utiliser des crèmes solaires à base de chocolat", "De diminuer sa consommation de chocolat", "De manger quotidiennement du chocolat", "De suivre un traitement de pilules au chocolat"],
    reponseCorrecte: 2, explication: "Les chercheurs recommandent de consommer trois carrés de chocolat par jour, ce qui correspond à manger quotidiennement du chocolat."
  },
  {
    id: 13, niveau: "B1",
    texte: "Adoptées séparément à la naissance, des jumelles indonésiennes se sont retrouvées 29 ans plus tard en Suède. Elles habitaient à 40 km l'une de l'autre mais ne le savaient pas. Leurs parents adoptifs avaient été informés de leur lien de parenté mais avaient arrêté leurs recherches. C'est un message posté sur Facebook par l'une des jumelles qui a permis leur rencontre. Elles sont l'une et l'autre enseignantes !",
    question: "Qu'est-ce que ces jumelles ont en commun ?",
    options: ["Elles adorent utiliser Facebook", "Elles enseignent dans la même école", "Elles habitent dans le même pays", "Elles ont la même famille adoptive"],
    reponseCorrecte: 2, explication: "Les deux jumelles habitent toutes les deux en Suède, donc dans le même pays, à seulement 40 km l'une de l'autre sans le savoir."
  },
  {
    id: 14, niveau: "B1",
    texte: "« Avec un Master Commerce en poche, je ne pensais pas qu'il serait à ce point difficile de trouver mon premier emploi. Et pourtant... quel chemin semé d'embûches ! Tout le monde me disait : Ne t'inquiète pas, dans deux ou trois mois tu auras trouvé ! Sept mois plus tard toujours rien en vue. À 26 ans, je me retrouve sans emploi, toujours chez mes parents. L'avenir ? Je le vois ailleurs, je prépare activement mon départ pour l'Angleterre. »\nAmandine n'est pas une exception chez les jeunes. Les diplômes ne suffisent plus à assurer une situation stable en France et beaucoup de jeunes décident de partir à l'étranger pour obtenir un emploi.",
    question: "De quoi parle cet article ?",
    options: ["La difficulté de trouver un stage à l'étranger", "La nécessité de s'exiler pour pouvoir travailler", "Le manque de formation des jeunes diplômés", "Le niveau trop faible des salaires proposés"],
    reponseCorrecte: 1, explication: "L'article parle de jeunes diplômés qui ne trouvent pas d'emploi en France et qui doivent partir à l'étranger, illustrant la nécessité de s'exiler pour pouvoir travailler."
  },
  {
    id: 15, niveau: "B1",
    texte: "Pour ou contre les devoirs ?\nUne école donne sa réponse en accueillant chaque lundi, de 17 à 18 heures, les élèves qui peuvent revenir en classe faire leurs devoirs avec leur enseignant, et leurs parents. Ainsi, un dialogue s'instaure entre enseignants, parents et élèves. Le directeur relève un autre avantage : les devoirs sont bien faits. Mais les devoirs alourdissent des journées déjà longues. Avec six heures de cours, quatre jours par semaine, l'écolier français décroche la première place sur le podium de la fatigue.",
    question: "Que propose cette école ?",
    options: ["D'alléger les emplois du temps le lundi pour les professeurs", "De permettre aux enfants de faire leur travail du soir en classe", "De supprimer totalement le travail à la maison pour les élèves", "D'inviter les parents à des visites régulières de l'établissement"],
    reponseCorrecte: 1, explication: "L'école propose aux élèves de revenir en classe le lundi de 17h à 18h pour faire leurs devoirs avec l'enseignant, c'est-à-dire faire leur travail du soir en classe."
  },
  {
    id: 16, niveau: "B1",
    texte: "Pour permettre à tous un accès égal au sport, la maison départementale des personnes handicapées offre d'accompagner ceux qui sont en situation de handicap dans leurs projets de loisirs sportifs. Ce service propose une aide dans le choix d'une activité, une recherche de clubs capables de les accueillir et si besoin, un accompagnement dans le premier contact avec l'association. Il s'agit de partir des besoins, des envies et des possibilités de la personne, pour construire avec elle son projet sportif adapté.",
    question: "Que propose la maison départementale ?",
    options: ["De faciliter les rencontres avec des sportifs handicapés", "De trouver des entraîneurs spécialisés en handisport", "D'encourager les personnes handicapées à faire du sport", "D'organiser les matchs avec des sportifs handicapés"],
    reponseCorrecte: 2, explication: "La maison départementale aide les personnes handicapées à trouver une activité sportive et à rejoindre des clubs, les encourageant ainsi à pratiquer le sport."
  },
  {
    id: 17, niveau: "B1",
    texte: "COMMENT APPRENDRE UNE LANGUE ÉTRANGÈRE\nExiste-t-il un âge critique au-delà duquel on ne peut plus jamais atteindre le niveau d'un locuteur natif ? Ce sujet fait l'objet de nombreux débats. Plus on est jeune, plus on a d'appétit pour découvrir le monde. L'apprentissage d'une langue, quelle qu'elle soit, est donc plus simple. Mais il y a également une composante sociale. On se comporte avec l'enfant d'une manière bien particulière, que l'on ne peut reproduire avec un adolescent ou un adulte.",
    question: "D'après cet extrait, qu'est-ce qui favorise chez les enfants l'apprentissage d'une langue étrangère ?",
    options: ["Leur curiosité", "Leur imagination", "Leur mémoire", "Leur obéissance"],
    reponseCorrecte: 0, explication: "Le texte mentionne que 'plus on est jeune, plus on a d'appétit pour découvrir le monde', ce qui correspond à la curiosité naturelle des enfants."
  },
  {
    id: 18, niveau: "B1",
    texte: "La question de l'orientation est fondamentale et se pose inévitablement au moment de commencer des études universitaires. Comment faire le bon choix ? Sur quelles bases ? Quel parcours sera le mieux adapté à la personnalité scolaire et psychologique, aux capacités de l'étudiant ? Un livre, édité par le magazine l'Étudiant, propose une démarche progressive qui aide à définir un projet en fonction des goûts et d'un objectif professionnel.",
    question: "Que peut-on trouver dans ce livre ?",
    options: ["Des idées de stages en entreprise", "Un guide des démarches d'inscription", "Une méthode pour choisir une formation", "Une sélection des meilleures universités"],
    reponseCorrecte: 2, explication: "Le livre propose 'une démarche progressive qui aide à définir un projet', ce qui correspond à une méthode pour choisir une formation adaptée."
  },
  {
    id: 19, niveau: "B1",
    texte: "Madame Mansion,\nSuite à notre conversation téléphonique pour le travail de secrétaire, nous aimerions vous rencontrer jeudi prochain à 10h00 dans nos bureaux. Il faudra apporter une photocopie de votre carte d'identité et de vos diplômes. Merci de nous rappeler pour confirmer.\nCordialement,\nMathieu Leroux\nDirecteur du service des ressources humaines",
    question: "Que doit faire Mme Mansion ?",
    options: ["Annuler un rendez-vous", "Chercher des documents", "Envoyer un curriculum vitae", "Téléphoner à l'entreprise"],
    reponseCorrecte: 3, explication: "La lettre demande à Mme Mansion de 'rappeler pour confirmer' le rendez-vous, ce qui signifie téléphoner à l'entreprise."
  },
  // --- NIVEAU B2 ---
  {
    id: 20, niveau: "B2",
    texte: "Chers Valérie et Serge,\nQue vos projets immobiliers voient enfin le jour avec cette année qui débute ! Qu'elle vous apporte la joie de déménager à Nancy comme vous le souhaitez, mais aussi, à tous les niveaux, réussite et beaucoup de bonheur !\nJ'espère que nous aurons le temps de nous voir plus souvent et de partir à nouveau en vacances ensemble. Notre séjour en Corse reste un merveilleux souvenir pour moi.\nJe vous embrasse.\nElisa",
    question: "Quel est le but de cette lettre ?",
    options: ["Annoncer l'achat d'un appartement", "Donner des nouvelles à des amis", "Envoyer des vœux de nouvel an", "Organiser un voyage en Corse"],
    reponseCorrecte: 2, explication: "Elisa souhaite que 'cette année qui débute' apporte réussite et bonheur, formulation typique des vœux de nouvel an."
  },
  {
    id: 21, niveau: "B2",
    texte: "Les bons vieux bancs verts sur les trottoirs parisiens ont de la concurrence. Depuis le mois de décembre, sur certains boulevards, un nouveau mobilier urbain a fait son apparition, avec 12 modèles de banquettes, chaises et tabourets. Pour la première fois, la ville de Paris recueille l'avis des usagers et des riverains. Le traditionnel banc en fonte et bois a-t-il encore de l'avenir au milieu de ce mobilier futuriste ?",
    question: "Quelle est l'originalité de ce projet ?",
    options: ["La priorité donnée à l'aspect écologique", "La prise en compte de l'opinion publique", "Le caractère provisoire de l'installation", "Le choix des matériaux de fabrication"],
    reponseCorrecte: 1, explication: "Pour la première fois, la ville de Paris consulte les usagers et riverains sur le mobilier urbain, ce qui constitue une prise en compte de l'opinion publique."
  },
  {
    id: 22, niveau: "B2",
    texte: "Le smartphone participe à l'entretien d'un lien pathologique de plus en plus répandu, le désir de mainmise des parents sur les adolescents. La crise d'adolescence confronte les parents au défi de l'autonomie de l'adolescent et les oblige à faire le deuil de leur position de parent. Cela suppose qu'ils lâchent prise et fassent confiance à leur enfant. Mais de plus en plus de parents souhaitent que leur ado reste à la maison. Le smartphone, qui permet de rester en lien avec ses copains, arrange donc les parents.",
    question: "Quel est le constat de l'auteur à propos des smartphones ?",
    options: ["Ils éloignent les jeunes du monde des adultes", "Ils entraînent des comportements de type addictif", "Ils ont tendance à couper les adolescents du réel", "Ils peuvent être utilisés comme outils de contrôle"],
    reponseCorrecte: 3, explication: "Le texte montre que le smartphone permet aux parents d'exercer une surveillance sur leurs adolescents, en faisant office d'outil de contrôle."
  },
  {
    id: 23, niveau: "B2",
    texte: "La récente entrée au musée d'Orsay de plusieurs tableaux cubistes marque un tournant dans la reconnaissance officielle de ce courant artistique. Apollinaire, poète et critique d'art, avait défendu le cubisme avec ardeur au début du XXe siècle, à une époque où les institutions culturelles le rejetaient catégoriquement. Longtemps marginalisée, sa vision prophétique est aujourd'hui pleinement reconnue par les plus grands musées du monde.",
    question: "Comment peut-on qualifier la place accordée au cubisme dans les institutions culturelles actuelles ?",
    options: ["Le résultat d'une lutte menée par des gens orgueilleux et intolérants", "Le triomphe d'une opinion émise par Apollinaire mais autrefois combattue", "Un miracle dû à la persévérance des archéologues sur plusieurs continents", "La consécration des œuvres européennes jusqu'alors remisées dans les musées"],
    reponseCorrecte: 1, explication: "Le texte montre que l'opinion d'Apollinaire, longtemps rejetée par les institutions, est aujourd'hui reconnue, représentant le triomphe d'une idée autrefois combattue."
  },
  {
    id: 24, niveau: "B2",
    texte: "Quelles sont les forces dont disposa l'Homme pour conquérir l'hégémonie sur la planète ?\nL'homme est dépourvu de moyens physiques. Il n'a ni crocs, ni griffes, ni armure, il est chétif, fragile et vulnérable. Mais d'une part, il prime tous autres compagnons de vie par la puissance de son cerveau ; d'autre part, il est attiré par ses semblables. Il tend à faire groupe avec les autres individus de son espèce, et ce sont ces tendances sociales qui, multipliant l'homme par lui-même, lui ont donné le moyen d'atteindre à de si prodigieux résultats dans le domaine du savoir comme dans celui du pouvoir.",
    question: "Qu'est-ce qui a permis à l'espèce humaine de conquérir le monde, à part son intelligence ?",
    options: ["La fréquence de ses congénères", "L'amélioration de son habitat naturel", "Les mutations de son organisme", "L'extermination des autres espèces"],
    reponseCorrecte: 0, explication: "Le texte explique que l'homme 'tend à faire groupe avec les autres individus de son espèce', c'est-à-dire sa capacité à se regrouper en nombre avec ses congénères."
  },
  {
    id: 25, niveau: "B2",
    texte: "Le témoignage de Maud est très représentatif de la vie étudiante actuelle :\n« J'ai cherché un logement près de la fac. J'ai trouvé un studio à 600€ par mois. Mon père me donne 500 par mois. Je dois travailler comme surveillante dans un lycée. Les fins de mois sont difficiles, mais mon dossier d'allocation logement vient d'être accepté. Finalement ? J'ai de la chance ! »",
    question: "Pourquoi Maud pense-t-elle avoir de la chance ?",
    options: ["Elle aura un meilleur pouvoir d'achat sous peu", "Elle se débrouille sans l'aide de personne", "Elle trouvera facilement un emploi après l'université", "Elle va habiter près de chez ses parents"],
    reponseCorrecte: 0, explication: "Son dossier d'allocation logement vient d'être accepté, ce qui va lui apporter un complément financier et améliorer son pouvoir d'achat prochainement."
  },
  {
    id: 26, niveau: "B2",
    texte: "Le rapport de l'Agence internationale de l'énergie se concentre sur les données de la dernière conférence climatique. Il contient une information intéressante : d'après l'agence, les réserves mondiales de gaz sont plus importantes que prévu. Le marché mondial serait même sous la menace d'un excédent massif, en raison de l'essor de la production américaine et d'une chute de la demande liée à la crise.",
    question: "Qu'a révélé le rapport de l'agence internationale de l'énergie ?",
    options: ["La consommation de gaz dans le monde augmente", "La demande croissante en gaz a des effets sur le climat", "Les besoins en gaz des Américains sont supérieurs à l'offre", "Les ressources en gaz à l'échelle mondiale s'accroissent"],
    reponseCorrecte: 3, explication: "Le rapport indique que 'les réserves mondiales de gaz sont plus importantes que prévu', ce qui signifie que les ressources à l'échelle mondiale s'accroissent."
  },
  {
    id: 27, niveau: "B2",
    texte: "Une étude récente révèle que la concentration de déchets plastiques flottant à la surface du Pacifique nord a été multipliée par cent en quarante ans. Ce constat, émis par les pêcheurs en haute mer, est alarmant car cette pollution a des conséquences environnementales. La gigantesque plaque de déchets flottant sur l'océan Pacifique est passée par endroits à plusieurs dizaines de mètres, constituant un milieu favorable à la reproduction d'une espèce d'araignée d'eau. Cet insecte est en train de se multiplier dans le Pacifique nord. Si la densité des plastiques continue à augmenter, certaines espèces pourraient continuer à se multiplier, risquant de déséquilibrer l'écosystème du Pacifique.",
    question: "Quel danger représentent ces déchets ?",
    options: ["Un obstacle pour les bateaux de pêche", "Un réchauffement dramatique des eaux", "Un risque d'intoxication des populations du Pacifique", "Une diminution de la diversité de la faune océanique"],
    reponseCorrecte: 3, explication: "Les déchets favorisent la prolifération d'une espèce au détriment des autres et risquent de 'déséquilibrer l'écosystème', ce qui entraînerait une diminution de la diversité de la faune océanique."
  },
  {
    id: 28, niveau: "B2",
    texte: "Avez-vous déjà observé des familles en train de remplir des sachets de bonbons sur un stand de confiserie ? Un chercheur américain a montré qu'elles en achètent plus quand les bonbons sont de couleurs différentes. De nombreuses observations similaires prouvent que les entreprises agroalimentaires connaissent nos comportements et la manière dont nous prenons certaines de nos décisions. Par exemple, elles exploitent notre préférence innée pour le sucre à tous les âges. Elles savent que l'éducation nutritionnelle des enfants et des jeunes est défaillante dans certaines familles et en profitent.",
    question: "Que dénonce l'auteur de cet article ?",
    options: ["La manipulation des clients par les industriels", "L'attitude imprévisible des consommateurs", "L'uniformisation des saveurs et des goûts", "L'utilisation abusive des produits de synthèse"],
    reponseCorrecte: 0, explication: "L'auteur montre comment les entreprises agroalimentaires exploitent sciemment les comportements des consommateurs à leur profit, ce qui constitue une manipulation des clients."
  },
  {
    id: 29, niveau: "B2",
    texte: "L'étendue et la variété des invités reçus par le Parlement Européen ne cessent d'étonner. Prix Nobel, stars de série télé, grand maître des échecs... Cette diversité n'a d'égale que l'éclectisme des sujets préparés et débattus au sein de l'hémicycle : la situation dans des pays en guerre, les relations entre pays, les changements climatiques... Bien évidemment, ces personnalités connues et reconnues ne sont pas choisies pour les paillettes et le strass qu'elles peuvent, parfois, véhiculer, mais parce qu'elles ont une expertise reconnue ou un message à délivrer.",
    question: "À quoi réfère le terme « diversité » dans le texte ?",
    options: ["Aux hôtes du parlement", "Aux idées débattues", "Aux pays représentés", "Aux projets de loi votés"],
    reponseCorrecte: 0, explication: "Le texte décrit la 'diversité' des 'invités reçus par le Parlement Européen' : Prix Nobel, stars, joueurs d'échecs... La diversité fait référence aux personnalités accueillies, c'est-à-dire aux hôtes du parlement."
  },
  // --- NIVEAU C1 ---
  {
    id: 30, niveau: "C1",
    texte: "Parcourir les routes d'Europe l'été, beaucoup de touristes le font sans forcément connaître les règles en vigueur dans chacun des pays. Ce qu'il faut savoir, c'est qu'il existe des différences qui peuvent être notables selon les législations. Alors que la vitesse maximale sur autoroute est de 130 km/h en France, elle n'est que 120 km/h en Belgique, en Espagne ou au Portugal. Quant au taux d'alcoolémie toléré, il varie de 0,8 g/l en Irlande à zéro en République tchèque.",
    question: "Que fait l'auteur de cet article ?",
    options: ["Il commente une loi", "Il donne un conseil", "Il formule une plainte", "Il raconte une anecdote"],
    reponseCorrecte: 1, explication: "L'auteur informe les lecteurs sur les différences de règles routières en Europe afin de les aider à mieux voyager, ce qui correspond à donner un conseil pratique."
  },
  {
    id: 31, niveau: "C1",
    texte: "On s'est habitué depuis belle lurette à ne plus rencontrer de poinçonneurs dans le métro ni de pompistes dans les stations-service. Mais la liste des professions en voie de disparition ne cesse de s'allonger. Caissières dans les supermarchés, guichetiers dans les banques, hôtesses dans les cinémas...\nTous remplacés par des machines ? Pas si simple. Comme l'analyse Thibaut Carpentier, directeur du cabinet de conseil Obsand, la tentation industrielle de réduire les frais de personnel est grande mais cette logique se heurte à celle des consommateurs qui ont du mal à se passer d'une personne humaine. D'ailleurs, toutes les entreprises concernées l'ont bien compris : pas de suppression de postes mais des redéploiements avec élargissement des compétences.",
    question: "Quel obstacle rencontre l'automatisation des services ?",
    options: ["Les coûts élevés des investissements", "Les faibles qualifications des employés", "Les réticences émises par la clientèle", "Les spécificités de certains métiers"],
    reponseCorrecte: 2, explication: "Le texte indique que la logique d'automatisation 'se heurte à celle des consommateurs qui ont du mal à se passer d'une personne humaine', ce qui représente les réticences de la clientèle."
  },
  {
    id: 32, niveau: "C1",
    texte: "Théâtre\nJoël Pommerat nous offre un très court spectacle dont le ton, la pureté formelle et le sens nous ont conquis. La matière en est constituée par une série de rencontres, auxquelles lui-même et son équipe assistent, entre des travailleurs sociaux et des femmes d'origine simple vivant en cité, et en proie à des problèmes familiaux. De ces confidences relatives aux tensions qu'elles connaissent dans leurs rapports, soit avec leurs parents, soit avec leurs enfants, Pommerat a tiré une suite de brèves séquences qui composent une fresque intense de la souffrance familiale, et particulièrement de la souffrance de la femme. Son regard sur la détresse humaine est d'une bienveillance et d'une tendresse infinies ; il ne nous livre aucun message moral et à peine un message social. Il fait simplement appel à notre sensibilité.",
    question: "Dans quel objectif Joël Pommerat a-t-il créé son spectacle ?",
    options: ["Aider les femmes à se battre pour améliorer leur situation familiale", "Amener les spectateurs à s'émouvoir d'un quotidien douloureux", "Démontrer que la condition de la femme dans les cités est désastreuse", "Informer des difficultés que peuvent rencontrer les enfants des cités"],
    reponseCorrecte: 1, explication: "Pommerat 'fait simplement appel à notre sensibilité' sans message moral ni social, cherchant à toucher les spectateurs face à la souffrance humaine du quotidien."
  },
  {
    id: 33, niveau: "C1",
    texte: "Plancher sur la réforme des rythmes scolaires, comme le fera la « Conférence » installée aujourd'hui par le ministre de l'éducation, c'est prendre en compte toute une série de paramètres qui n'ont rien à voir, ou si peu, avec l'école primaire. C'est s'intéresser aux évolutions de la famille et à la multiplication des horaires de travail dits « atypiques », c'est examiner, du point de vue des collectivités locales, les conséquences financières et pratiques (transport scolaire, cantine, centres de loisirs) de tout changement éventuel dans l'organisation de la semaine. C'est encore recueillir l'avis des experts de la circulation routière et entendre les préoccupations des professionnels du tourisme... Autant dire que l'intérêt de l'enfant se trouve plus ou moins sacrifié sur l'autel du compromis.",
    question: "Quel constat dresse le journaliste à propos de la réforme des rythmes scolaires ?",
    options: ["Les familles sont opposées à toute modification", "Les impacts financiers demeurent insurmontables", "Les intérêts en jeu sont difficilement compatibles", "Les opinions des experts sont en total désaccord"],
    reponseCorrecte: 2, explication: "Le journaliste montre que de nombreux intérêts contradictoires (familles, collectivités, tourisme...) entrent en jeu, rendant les compromis difficiles au détriment de l'enfant."
  },
  {
    id: 34, niveau: "C1",
    texte: "L'éclairage évènementiel est une discipline artistique récente qui consiste à créer des décors et des ambiances par un jeu de lumières projetées sur des monuments et des sites remarquables. L'intérêt de cet art est double : il permet, sans toucher au site qui accueille l'événement, de modifier littéralement l'aspect d'une façade ou d'un intérieur et de personnaliser un lieu en rapport avec le thème abordé. Ainsi une grande ville comme Paris peut façonner ses monuments et ses bâtiments publics grâce aux éclairages conçus et réalisés par de véritables artistes.",
    question: "Quel est l'atout principal de cette discipline artistique ?",
    options: ["Donner une dimension nouvelle aux lieux mis en scène", "Permettre la réhabilitation des monuments historiques", "Transformer de manière durable les bâtiments illuminés", "Valoriser culturellement des zones urbaines délaissées"],
    reponseCorrecte: 0, explication: "L'éclairage permet de 'modifier littéralement l'aspect d'une façade' et de 'personnaliser un lieu', donnant ainsi une dimension nouvelle aux espaces existants."
  },
  {
    id: 35, niveau: "C1",
    texte: "Plutôt que de multiplier les tests et les mises en situation, certaines entreprises choisissent de déléguer la responsabilité du recrutement à leurs salariés. « Personnellement, je suis très favorable à la cooptation, affirme ce responsable. Si vous avez un bon élément dans votre équipe, il y a une excellente chance qu'il vous amène un autre bon élément, ça permet de limiter les risques. » Signe des temps, la « cooptation » est aujourd'hui acceptée et revendiquée par tous. Dans certaines entreprises, elle est même encouragée par une prime : 4 000 euros sont versés à tout employé ayant recommandé un candidat recruté à son tour.",
    question: "En adoptant la cooptation pour le recrutement, que recherchent les entreprises ?",
    options: ["À gagner du temps", "À minimiser les aléas", "À réduire les frais", "À simplifier les procédures"],
    reponseCorrecte: 1, explication: "La cooptation 'permet de limiter les risques' selon le responsable cité, ce qui correspond à minimiser les aléas lors du recrutement."
  },
  // --- NIVEAU C2 ---
  {
    id: 36, niveau: "C2",
    texte: "Le discours écologique actuel est très factuel, « pratico-pratique » comme si on n'osait pas parler de cette beauté dont nous avons pourtant besoin pour nous épanouir. C'est peut-être l'une des raisons pour laquelle l'écologie politique ne rallie pas à tant que ça. Si on n'est pas sensible à la terre, aux végétaux, on devient un technicien de l'environnement, on emploie un langage neutre et rassurant, fait d'« environnement » et de « développement durable ». Mais il faut pouvoir parler de la beauté spécifique de la nature qui nous enchante, qui nous fait vibrer. Nous avons besoin de nous nourrir de sa splendeur, de son mystère, et pas seulement de ses aspects matériels, pratiques, biologiques.",
    question: "Selon l'intervenant, qu'est-ce qui caractérise le discours écologique actuel ?",
    options: ["Il apaise les tensions de la société", "Il insiste sur le point de vue matériel", "Il propose des programmes utopiques", "Il traite les problèmes liés aux sols"],
    reponseCorrecte: 1, explication: "L'auteur critique le discours 'pratico-pratique' qui ne parle que des aspects matériels, pratiques et biologiques de la nature, au détriment de sa dimension esthétique et émotionnelle."
  },
  {
    id: 37, niveau: "C2",
    texte: "Le Bon Usage est un gros livre, parce que son auteur n'a voulu éluder aucune des chausse-trapes de cette langue française dont Colette disait : « C'est une langue bien difficile que le français. À peine écrit-on depuis quarante-cinq ans qu'on commence à s'en apercevoir. » J'avais craint, jadis, que la masse même du volume n'en rebutât plus d'un. Appréhension vaine : l'ouvrage s'est étoffé à chaque réédition, la typographie (tout en restant d'une parfaite lisibilité) se présente dans une composition beaucoup plus serrée, et le succès du livre va croissant, à mesure que le lecteur a davantage le sentiment qu'il est aimablement conduit par la main grâce surtout à un index infiniment précis, et que les explications qu'on lui propose ne sont pas de sommaires ukases, mais le reflet patient, probe jusqu'à l'avenir d'incertitudes, d'une actualité aussi mouvante que la vie.",
    question: "D'après cet extrait, quelle est la plus grande qualité du Bon Usage ?",
    options: ["Il est complet", "Il est concis", "Il est innovant", "Il est irréfutable"],
    reponseCorrecte: 0, explication: "L'auteur n'a 'voulu éluder aucune des chausse-trapes' et l'ouvrage 's'est étoffé à chaque réédition', soulignant son caractère exhaustif et complet."
  },
  {
    id: 38, niveau: "C2",
    texte: "Il est incroyable que la perspective d'avoir à lire son propre livre en public n'ait jamais fait renoncer un écrivain à l'écrire. Rien n'est extravagant comme ces émissions littéraires où ils sont régulièrement requis de sacrifier à ce rituel qui suppose tout de même une habitude, pour ne pas dire une technique, qui ne sont pas données à tous les romanciers. La plupart n'osent pas les refuser, en quoi ils ont tort. Pour les convaincre de renoncer à ce dernier avatar de leur vanité, il suffirait de les emmener, un soir, écouter des comédiens lire leur livre. En principe, si l'on est lucide et de bonne foi, on ne se remet pas d'une telle épreuve.",
    question: "Que pense cet écrivain de la lecture publique d'un roman par son auteur ?",
    options: ["Elle demande de posséder des talents d'acteur", "Elle dessert le travail d'écriture du romancier", "Elle est particulièrement adaptée au petit écran", "Elle rend les émissions littéraires prétentieuses"],
    reponseCorrecte: 1, explication: "L'auteur suggère que la lecture par les comédiens est bien supérieure à celle de l'écrivain lui-même, ce qui montre que la lecture publique par l'auteur dessert son propre travail."
  },
  {
    id: 39, niveau: "C2",
    texte: "Le trois-mâts scientifique Tara va reprendre le large pour une nouvelle mission. Le voilier se met en configuration optimale pour naviguer dans les grandes régions fluviales du monde. Il recueillera des données sur la biodiversité aquatique et les concentrations de microplastiques dans les eaux. Le réchauffement climatique et la déforestation constituent des menaces majeures pour ces écosystèmes fragiles. Cette mission, menée en partenariat avec des institutions scientifiques françaises, s'attache à documenter l'évolution de la biodiversité dans les bassins des grands fleuves.",
    question: "Selon l'article, quelle est la mission de l'expédition du Tara ?",
    options: ["Former des scientifiques à la prévention des risques écologiques", "Innover dans les moyens de lutter contre les pollutions fluviales", "Observer l'écosystème dans une région de grands fleuves", "Représenter le gouvernement français lors d'une rencontre"],
    reponseCorrecte: 2, explication: "Le voilier 'recueillera des données sur la biodiversité aquatique' dans les 'grandes régions fluviales', ce qui correspond à observer l'écosystème dans une région de grands fleuves."
  },
];