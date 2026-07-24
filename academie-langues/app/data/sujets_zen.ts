import { banqueExpressionEcrite } from "./banque_expression_ecrite";

// Sujets natifs du mode Zen
const sujetsZenNatifs = {
  1: [
    "Votre ami souhaite commencer à faire du sport. Rédigez un message pour lui recommander une salle de sport située dans votre quartier (localisation, tarifs, types d’activités, etc.).",
    "Écrivez un courriel à vos amis pour les inviter à un anniversaire surprise de votre meilleur(e) ami(e). (Lieu, date, horaire, etc.).",
    "Vous voulez changer la décoration de votre appartement (meubles, peinture, objets, etc.). Vous écrivez un message à un(e) ami(e) pour lui décrire votre projet et lui demander de vous aider.",
    "Je cherche un vélo en bon état et bon marché. Contactez moi par courriel : mathieu@gmail.com\n\nCONSIGNE : Vous avez un vélo à vendre. Vous écrivez un courriel pour décrire votre vélo et proposer un prix. Vous lui donnez un RDV pour essayer le vélo.",
    "Écrivez un message pour inviter vos amis à une fête de fin d’année.",
    "Écrivez un message à votre ami(e) qui souhaite suivre des cours de langue dans votre école. Donnez les détails spécifiques pour aider votre ami(e) à faire son choix. (lieu, tarifs, types de cours disponibles, etc.).",
    "Un nouveau restaurant vient d’ouvrir près de chez vous. Vous écrivez à un(e) ami(e) pour lui proposer d’y aller avec vous. Vous décrivez le restaurant (cuisine, prix, décoration, etc.).",
    "Écrivez un message dans le journal de votre université pour rechercher un partenaire avec qui faire du sport.",
    "Écrivez un courriel à votre ami pour l’inviter à passer une journée avec vous (lieu, date, activités, etc).",
    "Vous avez trouvé un nouveau travail. Vous écrivez à votre ami(e) francophone pour lui annoncer la nouvelle. Vous décrivez votre poste, vos collègues et votre lieu de travail.",
    "« Salut, Comment ça va ? Alors, comment est la nouvelle université ? Est-ce que les étudiants sont sympas ? Comment sont les profs ? À bientôt. Alex »\n\nCONSIGNE : Vous répondez à Alex dans un message où vous décrivez votre université (professeurs, étudiants, activités, etc.).",
    "Vous faites du sport dans un club. Vous venez de remporter une compétition, vous écrivez un courriel à vos amis pour leur raconter cet évènement sportif et annoncer votre réussite sportive.",
    "Vous voulez organiser une visite culturelle dans votre ville. Vous envoyez un message pour inviter vos amis. Vous leur donner toutes les informations nécessaires (activités, date, lieu, etc.).",
    "Répondez au courriel de votre ami Lucas pour lui donner des informations sur les nouveaux locaux de votre entreprise (lieu, disposition des pièces, équipements, etc.).",
    "France Télévision prépare un reportage sur le sport amateur. Et vous, quel sportif êtes-vous ? Envoyez-nous vos témoignages sur francetélévision.fr. (60 mots minimum/120 mots maximum)",
    "Vous avez commandé un objet sur Internet et après réception du colis, vous constatez que l’objet est cassé. Rédigez un e-mail au service clientèle pour signaler le problème, décrivez le dommage de l’objet et précisez ce que vous attendez comme solution. (60 mots minimum/120 mots maximum)",
    "Vous avez passé un week-end à la campagne. Écrivez un message à votre ami(e) pour lui décrire ce qui s’est passé. (60 mots minimum/120 mots maximum)",
    "Vous voulez partir en week-end avec vos amis le mois prochain. Vous leur écrivez un message pour décrire votre projet (lieu, transport, activités, etc.).",
    "Vous avez invité votre ami Cédric à votre mariage au Château de Chombony et il vous a répondu qu’il ne connaît pas ce château. Décrivez à votre ami (lieu, localisation, transports, etc.).",
    "« Je cherche une voiture en bon état. Contactez-moi par courriel : mathieu@gmail.com » Vous avez une voiture à vendre. Vous écrivez un courriel pour décrire votre voiture et proposer un prix. Vous lui donnez un RDV pour essayer la voiture."
  ],
  2: [
    "Vous avez participé à un événement qui vous a marqué (anniversaire, mariage, etc.). Racontez votre souvenir en décrivant ce qui vous a le plus marqué.",
    "Vous avez participé à une brocante (achat / vente de produits d’occasion) dans votre ville. Sur votre blog personnel, racontez pourquoi vous avez aimé cette activité.",
    "« Ecole De Musique ! Cours gratuits, concerts, Jeux. Rendez-Vous Vendredi, À partir de 9 Heures »\n\nCONSIGNE : Vous avez participé à cet évènement. Vous écrivez à vos amis pour raconter votre expérience et vous donnez votre opinion sur cette journée.",
    "Vous avez passé une journée à la campagne avec vos amis. À votre retour, vous écrivez un message sur votre forum pour raconter à vos amis comment cette journée s’est passée. Vous expliquez ce que vous avez aimé (activités, lieu, animaux, etc…)",
    "Vous avez passé des vacances au Canada par le biais d’une agence de voyage. Écrivez un commentaire pour raconter votre expérience que vous avez vécue durant ce voyage.",
    "Vous travaillez dans une association qui aide les personnes âgées. Rédigez un article de blog pour raconter vos expériences et convaincre d’autres personnes de rejoindre l’association.",
    "Vous avez visité une ville que vous ne connaissiez pas. Vous avez envie de partager votre découverte. Vous postez un message sur un site Internet dédié aux voyages. Racontez votre expérience et expliquez ce qui vous a plu et ce qui vous a déplu dans la ville.",
    "Écrivez dans un article de blog pour raconter votre arrivée dans un pays étranger en donnant vos impressions.",
    "Vous avez participé à une journée de formation dans votre entreprise. Écrivez un courriel à vos collègues pour raconter cette journée et exprimer ce que vous avez apprécié.",
    "« Chers internautes, J’ai 19 ans, je vais bientôt partir à l’étranger pour continuer mes études. J’aimerais bien lire les témoignages et avis des étudiants qui ont déjà fait des études loin de chez eux. Merci de me répondre. Julie »\n\nCONSIGNE : Vous avez fait des études à l’étranger pendant un an. Vous écrivez une réponse sur le forum. Vous racontez votre séjour, vous dites si vous avez aimé ou non cette expérience et pourquoi.",
    "Vous avez décidé de ne plus utiliser votre réseau social préféré (Instagram, Facebook, etc.). Vous écrivez à vos amis pour leur raconter cette expérience et expliquer pourquoi vous avez pris cette décision.",
    "Le site « colocation.com » recherche des témoignages sur vos expériences de colocation. Vous avez déjà habité en colocation avec des amis. Vous racontez votre expérience aux membres du site internet. Vous donnez votre opinion sur ce mode de logement.",
    "« Vous avez participé à un concours de cuisine. Sur votre site Internet, vous écrivez un court article pour raconter cette journée. Vous expliquez pourquoi vous avez aimé ou pourquoi vous n’avez pas aimé cette expérience (120 mots minimum/150 mots maximum). »",
    "Vous avez assisté à une soirée écologique pour protéger la planète qui avait lieu dans votre université. Racontez-la dans votre blog et expliquez pourquoi vous l’avez aimée.",
    "Dans votre blog, racontez votre expérience de l’apprentissage d’une langue étrangère (vous écrivez sur un forum internet en racontant votre expérience en apprenant une langue étrangère).",
    "Exprimez votre admiration pour une personnalité, célèbre ou non, en vous appuyant sur ses actions spécifiques. Rédigez un article de blog en détaillant les actions remarquables de cette personne et expliquez pourquoi vous l’aimez.",
    "COURRIER DES LECTEURS Tout quitter pour partir en voyage pendant un an: bonne ou mauvaise idée ? Répondez sur notre site Internet : “voyage.internaute.fr”. Vous écrivez un message sur ce site internet, vous répondez à la question posée en prenant des exemples de votre vie personnelle."
  ],
  3: [
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LA LECTURE POUR LES ENFANTS",
      document1: "Avec l’avancée technologique et les produits high-tech qui envahissent de plus en plus notre quotidien, nos enfants oublient la lecture et s’intéressent davantage aux jeux vidéo... Contrairement à nous les adultes, la génération actuelle est toujours occupée par les réseaux sociaux et le gaming... Pourquoi devons-nous forcer les enfants à lire un bouquin ? Comme le dit un proverbe, ‘’ le goût de la lecture ne peut pas s’imposer’’…",
      document2: "L’amour de la lecture se transmet de génération en génération bien que, ces dernières années, on ne trouve plus beaucoup de bouquins entre les mains des enfants... En apprenant à lire régulièrement, l’enfant acquiert le langage plus aisément tout en développant sa capacité d’audition et de concentration.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES VOLS À BAS PRIX",
      document1: "Je fais souvent mes voyages avec des compagnies aériennes à bas prix. Les compagnies Low Cost mettent à disposition des prix inférieurs à ceux proposés par les compagnies aériennes régulières... À ce tarif-là, vous en doutez qu’il y a un hic, en effet, vous n’aurez le droit à aucun service à bord. Je dirais donc, que le low-cost n’est surtout pas fait pour les vols long courrier.",
      document2: "Récemment, j’ai pris la décision de ne plus voyager avec les compagnies aériennes à bas prix... des sièges inconfortables, des conditions de travail pénibles et surtout des avions vétustes qui remettent en cause la sécurité ! Dès lors, pour certains voyages, je vais opter pour la voiture ou même le train...",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "PETITS MAGASINS OU SUPERMARCHÉS ?",
      document1: "Le supermarché est très pratique ; on y trouve une grande variété de produits, tous à portée de main... De plus, les supermarchés offrent plusieurs marques pour un même produit, tout en proposant régulièrement des promotions et des remises.",
      document2: "ASSOCIATION POUR LA SAUVEGARDE DES PETITS COMMERCES. Le défi « Février sans supermarché » a été créé pour limiter la superpuissance des supermarchés et permettre aux petits commerces de survivre... Le client aura tout à gagner : il bénéficiera de produits frais de meilleure qualité et aura l’opportunité de papoter avec les voisins.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LA SÉVÉRITÉ DES PARENTS",
      document1: "Je vais bientôt avoir 22 ans et j’habite toujours chez mes parents. Mon père et ma mère restent autoritaires avec moi... Maintenant, peu de choses ont changé ; certes, j’ai le droit de veiller plus tard la nuit, mais ma mère ne cesse de m’appeler sur mon téléphone portable jusqu’à ce que je sois de retour.",
      document2: "Les parents ont parfois peur d’être trop sévères avec leurs enfants. Ils craignent, qu’à cause d’un excès d’autorité, leurs enfants ne s’épanouissent pas... Même si les parents acceptent, par amour, tout ce dont leurs enfants demandent, cela pourrait avoir des effets négatifs lorsqu’ils passent à l’âge adulte.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LIMITATION DES VOITURES EN VILLE",
      document1: "Avec des taux de pollution alarmants... plusieurs villes ont réussi leur pari d’interdire la circulation des voitures en zones urbaines. La capitale de Norvège, Oslo, a récemment opté pour cette solution... Après un certain temps, les accidents diminuent, la dépendance au pétrole baissera et la qualité d’air sera meilleure !",
      document2: "Beaucoup de villes se lancent dans des projets d’interdiction de voitures... sans mettre en place les outils nécessaires... Certes, en diminuant les voitures, on aura moins pollué, mais en contrepartie, il faut prévoir de gigantesques parkings, opter davantage pour le transport en commun et prévoir des autorisations pour certains métiers.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES ANIMAUX DE COMPAGNIE POUR ENFANTS",
      document1: "Offrir un animal de compagnie à un enfant présente de nombreux avantages... Pour des enfants qui n’ont pas des frères et/ou des sœurs, l’animal est un compagnon qui leur évitera la solitude. Grâce à lui, un enfant prendra confiance en lui et apprendra vite qu’un animal est un être vivant qui a besoin d’attention.",
      document2: "Beaucoup d’enfants demandent un jour ou l’autre un animal... Mais il vaut mieux réfléchir sérieusement avant d’acheter un animal domestique. L’animal devient un nouveau membre de la famille et représente un engagement sur de nombreuses années. Or, avoir un animal coûte souvent très cher, et c’est une grande responsabilité.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "VIE EN COLOCATION ENTRE ADULTES",
      document1: "Vivre avec d’autres personnes demande d’avoir une bonne entente et de respecter certaines règles. Il n’est pas toujours possible d’écouter sa musique préférée à volume élevé... Chaque individu a des habitudes susceptibles d’irriter les autres. L’organisation et la discussion sont les clés d’une colocation réussie ou non.",
      document2: "Être adulte et vivre en colocation ? C’est un choix qui permet d’accéder facilement à un logement plus spacieux et économique... De plus, en partageant le loyer et les charges avec vos colocataires, vous réduirez considérablement vos dépenses par rapport à un appartement individuel.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "RÔLE DE LA TÉLÉVISION",
      document1: "La télévision est un outil de communication et de divertissement largement répandu... Son influence est incontestable. Elle permet de diffuser des informations, d’offrir des divertissements variés et de favoriser la diffusion de la culture... La télévision joue un rôle important dans la transmission des connaissances.",
      document2: "La télévision peut également présenter certains inconvénients. Les émissions télévisées peuvent parfois véhiculer des stéréotypes... De plus, le temps passé devant la télévision peut réduire le temps consacré à d’autres activités plus enrichissantes, telles que la lecture, les interactions sociales ou le sport.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "L'AIDE AUX PERSONNES PAUVRES",
      document1: "Tous les ans, en hiver, je donne un peu de mon temps et de mon argent pour aider les personnes qui vivent dans la rue... C’est important de se soucier de ceux qui sont dans le besoin. Je trouve très important de donner quelques dollars à ces personnes ou aux associations... C’est un geste de solidarité.",
      document2: "Plutôt que de donner de l’argent à des personnes pauvres, il vaudrait mieux revoir notre mode de vie. C’est pourquoi je préfère m’engager au quotidien dans une association... Les sans domicile fixe ont besoin d’un logement et d’un travail et pas seulement d’argent. Donner de l’argent est un acte inutile qui sert seulement à apaiser notre conscience.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "PHOTO SUR LE CV",
      document1: "Aujourd’hui, certains candidats mettent une photo sur leur CV, d’autres non. Il faudrait interdire les photos sur les CV pour éviter les discriminations et les injustices... L’étude révèle que les employeurs prêtent plus attention à l’expérience professionnelle (32%) et aux diplômes (15%) qu’à l’apparence physique.",
      document2: "La question de la photo sur le CV divise les employeurs. Pour certains, la photo permet de mieux se représenter la personne avant de la rencontrer... Pour d’autres, cela dépend du poste : pour des métiers d’accueil, par exemple, il peut être pertinent d’inclure une photo.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "CUISINIER AMATEUR OU PROFESSIONNEL ?",
      document1: "Les amateurs ont fait des recettes réussies, mais ils manquent toujours des compétences et des techniques. C’est pourquoi la formation et l’expérience sont nécessaires pour être un vrai cuisinier.",
      document2: "De nombreux cuisiniers ont appris le métier sur internet et font le buzz sur les réseaux sociaux. Une amatrice est même devenue professionnelle et a rédigé plusieurs livres sur la cuisine pour les amateurs de cuisine à la maison.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "UTILISATION DES NOUVELLES TECHNOLOGIES",
      document1: "Jean : Je suis fermement convaincu que l’intégration des nouvelles technologies dans les écoles est cruciale pour préparer les élèves à un avenir numérique. L’usage des tablettes stimule l’engagement et enrichit l’expérience éducative en encourageant la créativité.",
      document2: "Sara : Je suis sceptique quant à l’usage intensif des technologies. Je crois que cela peut réduire les interactions humaines et favoriser une dépendance aux écrans. Les méthodes traditionnelles et le contact direct restent indispensables.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES DEVOIRS À LA MAISON",
      document1: "Selon des associations de parents d’élèves, les devoirs à la maison sont utiles car ils permettent d’apprendre l'autonomie. C'est aussi un lien quotidien avec l’école. C'est un moment partagé et valorisant avec les enfants.",
      document2: "Personne n'a jamais prouvé leur utilité pour améliorer les résultats. Beaucoup de parents ont peu de temps pour encadrer les devoirs. Ceux qui ne sont pas aidés à la maison sont défavorisés, il faut donc les supprimer.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "ÉCOLES PRIVÉES OU PUBLIQUES ?",
      document1: "Le succès des établissements privés est dû à la réputation : les élèves y sont mieux encadrés et surveillés. Les parents sont rassurés car les classes sont homogènes et accueillent souvent des élèves de milieux favorisés.",
      document2: "Ce système ne facilite pas la mixité sociale car les études sont payantes. Les élèves du privé ont rarement l’occasion de rencontrer des jeunes de milieux défavorisés. Cela reproduit les inégalités sociales.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES PRODUITS FAIT MAISON : POUR OU CONTRE ?",
      document1: "C’est formidable car on peut contrôler la composition des cosmétiques et produits ménagers. Il est préférable d'utiliser des ingrédients naturels sans produits chimiques. De plus, cela permet de réduire les emballages et les déchets.",
      document2: "Attention, il y a des risques pour la santé si on choisit de mauvais ingrédients ou si les règles d’hygiène ne sont pas respectées. Même si c'est économique, la fabrication « maison » prend souvent beaucoup de temps.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES VÊTEMENTS DE GRANDES MARQUES",
      document1: "Les vêtements de marques sont très importants pour les jeunes car c’est un moyen de s’exprimer et de se rattacher à un groupe social. Cette attirance aide les adolescents à chercher et montrer leur personnalité.",
      document2: "Les enfants grandissent très vite et les vêtements sont portés pendant une courte période. De plus, ils usent assez rapidement les vêtements en jouant à l’extérieur. Les habits sont très vite sales ou troués.",
      mots_min: 120,
      mots_max: 180
    },
    {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "OBJETS CONNECTÉS",
      document1: "Les objets connectés facilitent notre vie quotidienne (chauffage, fermeture des portes). Les montres mesurent nos pas pour inciter à faire de l'exercice. Certains objets agissent comme un carnet de santé et rappellent les RDV médicaux.",
      document2: "Face à cette évolution, la sécurité se pose. Un pirate informatique peut prendre le contrôle d’un objet en quelques minutes. Un cambrioleur pourrait surveiller les maisons ou pirater le système connecté d’une voiture.",
      mots_min: 120,
      mots_max: 180
    }
  ]
};

// Extraction des sujets de la banque corrigée (séries de 3 tâches)
const tachesBanque1 = banqueExpressionEcrite
  .flatMap((s) => s.taches)
  .filter((t) => t.numero === 1)
  .map((t) => t.consigne);

const tachesBanque2 = banqueExpressionEcrite
  .flatMap((s) => s.taches)
  .filter((t) => t.numero === 2)
  .map((t) => t.consigne);

const tachesBanque3 = banqueExpressionEcrite
  .flatMap((s) => s.taches)
  .filter((t) => t.numero === 3 && t.document1 && t.document2)
  .map((t) => ({
    consigne: t.consigne,
    titre: t.titre_corrige || "Documents à comparer",
    document1: t.document1!,
    document2: t.document2!,
    mots_min: 120,
    mots_max: 180,
  }));

// Fusion : sujets Zen natifs + sujets de la banque corrigée
export const banqueSujets = {
  1: [...sujetsZenNatifs[1], ...tachesBanque1],
  2: [...sujetsZenNatifs[2], ...tachesBanque2],
  3: [...sujetsZenNatifs[3], ...tachesBanque3],
};