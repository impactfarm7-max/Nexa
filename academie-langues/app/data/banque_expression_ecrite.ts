export type Tache = {
  numero: 1 | 2 | 3;
  consigne: string;
  document1?: string;
  document2?: string;
  corrige: string;
  titre_corrige?: string;
  mots_indicatif: number;
};

export type SujetBanque = {
  id: number;
  taches: Tache[];
};

export const banqueExpressionEcrite: SujetBanque[] = [
  {
    id: 1,
    taches: [
      {
        numero: 1,
        consigne: "Vous partez en voyage et vous laissez votre appartement à un ami qui veut venir rester chez vous pendant vos vacances. Vous lui envoyez un message pour décrire votre appartement (immeuble, logement, accès…).",
        corrige: `Salut Julien,

Je suis ravi que tu puisses rester chez moi pendant mon absence. J'habite dans un immeuble moderne situé dans un quartier calme et sécurisé, au troisième étage avec ascenseur.

L'appartement est un deux-pièces confortable, avec un salon lumineux, une chambre, une cuisine équipée et une salle de bain. Tu trouveras tout ce dont tu as besoin sur place.

Pour y accéder, il y a un code à l'entrée que je t'enverrai, puis ma porte est la deuxième à gauche. Les transports en commun sont à proximité et il y a un supermarché juste en bas de l'immeuble.

N'hésite pas si tu as des questions !

À bientôt,
Jeanne`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Écrivez un article de blog sur votre souvenir de voyage que vous avez le plus aimé.",
        titre_corrige: "Un souvenir de voyage inoubliable au cœur des montagnes",
        corrige: `Chers lecteurs,

Parmi tous mes voyages, celui que j'ai effectué dans une région montagneuse reste le plus marquant. Dès mon arrivée, j'ai été impressionné par la beauté des paysages et le calme qui y régnait.

Au cours de mon séjour, j'ai eu l'occasion de faire plusieurs randonnées. Un matin, en atteignant le sommet d'une colline, j'ai assisté à un lever de soleil spectaculaire. Les couleurs du ciel, mêlées à la brume, offraient une vue exceptionnelle. Ce voyage m'a également permis de rencontrer des habitants chaleureux, toujours prêts à partager leur culture et leurs traditions.

En définitive, cette expérience m'a profondément marqué. Elle m'a permis de me reconnecter à la nature et de vivre des moments simples mais précieux. C'est sans aucun doute le souvenir de voyage que je garderai le plus longtemps en mémoire.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `Les avantages : penser à l'avenir, avoir les vêtements propres, être en confort, surtout que l'argent n'est pas toujours suffisant. Vivre avec ses parents pendant la période des études permet aux jeunes d'économiser les frais de logement, de profiter de plats faits maison et d'une certaine stabilité psychique. Les adolescents qui vivent avec leurs parents peuvent économiser leur argent pour des projets de vie (ils ne paient ni le loyer ni la nourriture). Par exemple, pour ne pas payer un loyer qui coûte cher, le ménage est fait, les vêtements sont propres. Il est favorable que les jeunes vivent avec leurs parents, selon le témoignage de deux jeunes : une jeune fille disait que le loyer est très cher et qu'étudier loin de chez soi coûte plus cher. Le deuxième jeune trouve que vivre avec ses parents est plus bénéfique pour lui, par exemple : la nourriture est bonne, les vêtements sont toujours propres et il n'y a pas de place pour la solitude.`,
        document2: `Les inconvénients : manque de liberté. Vivre seuls leur permet d'être indépendants. Les adolescents qui vivent avec leurs parents s'ennuient car leurs parents décident à leur place et ils sont toujours dépendants de leurs parents. Un avis d'un certain monsieur de 25 ans qui a perdu son emploi : il était dans l'obligation de retourner vivre avec ses parents, et maintenant il a perdu son espace d'intimité. Contre la vie des jeunes avec leurs parents, un témoignage d'un jeune qui considère que revenir chez ses parents, c'est revenir en arrière.`,
        titre_corrige: "Vivre chez ses parents : entre confort et manque d'indépendance",
        corrige: `Les documents présentent deux points de vue sur le fait de vivre chez ses parents. D'un côté, cette situation offre plusieurs avantages, notamment sur le plan financier et matériel. Les jeunes peuvent économiser de l'argent, bénéficier de repas préparés et vivre dans un environnement stable. Certains témoignages soulignent également l'absence de solitude et le confort quotidien. D'un autre côté, les inconvénients sont aussi importants. Vivre chez ses parents peut limiter la liberté et l'autonomie des jeunes. Ils restent dépendants et peuvent avoir l'impression de ne pas évoluer. Un témoignage montre qu'un jeune adulte, contraint de revenir chez ses parents, a ressenti une perte d'intimité et un retour en arrière.

À mon avis, vivre chez ses parents peut être bénéfique, surtout pendant les études, car cela permet d'économiser et de se concentrer sur ses objectifs. Par exemple, un étudiant peut mettre de côté de l'argent pour financer ses projets futurs. En conclusion, cette situation est avantageuse à court terme, mais il est important de devenir indépendant à long terme.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 2,
    taches: [
      {
        numero: 1,
        consigne: "Votre ami veut se mettre au sport. Vous lui envoyez un message pour lui conseiller une salle de sport située dans votre quartier (localisation, prix, type d'activités, etc.).",
        corrige: `Salut Marc,

Je suis content que tu veuilles te mettre au sport ! Je te recommande une salle de sport située dans mon quartier, près du centre commercial, donc très facile d'accès.

Cette salle est bien équipée et propose plusieurs activités comme la musculation, le cardio, le fitness et même des cours collectifs (yoga, zumba, etc.). Les coachs sont professionnels et disponibles pour t'accompagner.

En ce qui concerne les prix, l'abonnement est assez abordable et il y a souvent des promotions pour les nouveaux inscrits.

L'ambiance est agréable et motivante, idéale pour commencer.

Si tu veux, on peut y aller ensemble un jour pour tester !

À bientôt,
Gérald`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez participé à un événement qui vous a marqué (anniversaire, mariage, etc.). Racontez votre souvenir.",
        titre_corrige: "Un anniversaire inoubliable entre émotion et joie",
        corrige: `Parmi les événements qui m'ont le plus marqué, l'anniversaire surprise organisé pour mon meilleur ami reste un souvenir mémorable. Tout a commencé plusieurs semaines avant, lorsque nous avons décidé, avec quelques proches, de lui préparer une fête exceptionnelle.

Le jour venu, nous nous sommes retrouvés dans une salle décorée avec soin. Lorsque mon ami est entré, il a été totalement surpris. Son visage exprimait à la fois de l'étonnement et une grande joie. L'ambiance était chaleureuse, rythmée par la musique, les rires et les échanges. Au cours de la soirée, chacun a partagé des souvenirs, ce qui a rendu le moment encore plus émouvant. En définitive, cet événement m'a profondément marqué, car il symbolise l'importance de l'amitié et des moments partagés. C'est ce genre de souvenir que je recommande vivement de créer, car il reste à jamais gravé en nous.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `Avec l'avancée technologique et les produits high-tech qui envahissent de plus en plus notre quotidien, nos enfants oublient la lecture et s'intéressent davantage aux jeux vidéo, aux sports, à la musique… Contrairement à nous, les adultes, dont beaucoup ont lu des milliers de pages, la génération actuelle est toujours occupée par les réseaux sociaux et le gaming ou prend du plaisir à pratiquer du sport qui attire davantage de jeunes grâce aux stars internationales du football, du tennis, de l'athlétisme… Alors, avec tout ça, pourquoi devons-nous forcer les enfants à lire un bouquin ? Et comme le dit un proverbe, « le goût de la lecture ne peut pas s'imposer »… il faut laisser l'enfant choisir ce qu'il veut lire et surtout ne pas l'obliger à lire quand il n'a pas envie.`,
        document2: `L'amour de la lecture se transmet de génération en génération, bien que ces dernières années, on ne trouve plus beaucoup de bouquins entre les mains des enfants, laissant la place aux smartphones et aux tablettes. En apprenant à lire régulièrement, l'enfant acquiert le langage plus aisément tout en développant sa capacité d'audition et de concentration. De plus, pour prendre du plaisir ensemble, les parents peuvent consacrer quotidiennement 10 minutes à leurs enfants pour lire des bouquins ; une activité qui renforcera à coup sûr la complicité parent/enfant.`,
        titre_corrige: "La lecture chez les enfants : entre contrainte et nécessité éducative",
        corrige: `Les documents présentent deux visions de la lecture chez les enfants. D'un côté, certains estiment qu'avec l'essor des technologies, les enfants préfèrent les jeux vidéo, les réseaux sociaux ou le sport. Selon eux, il ne faut pas imposer la lecture, car le plaisir de lire doit venir naturellement. Forcer un enfant pourrait produire l'effet inverse. D'un autre côté, d'autres défendent l'importance de la lecture dès le plus jeune âge. Elle permet de développer le langage, la concentration et les capacités d'écoute. De plus, la lecture partagée entre parents et enfants renforce les liens familiaux et transmet des habitudes positives.

À mon avis, il est essentiel d'encourager les enfants à lire sans les contraindre. Par exemple, un parent peut proposer des livres adaptés aux goûts de l'enfant et lire avec lui quelques minutes par jour pour éveiller son intérêt. En conclusion, la lecture est indispensable au développement de l'enfant, mais elle doit être encouragée de manière progressive et agréable.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 3,
    taches: [
      {
        numero: 1,
        consigne: "Vous faites du sport dans un club. Vous venez de remporter une compétition. Vous écrivez un courriel à vos amis pour leur raconter cet événement sportif et annoncer votre réussite sportive.",
        corrige: `Objet : Ma victoire aux olympiades de mon club

Salut les amis,

Je voulais partager avec vous une excellente nouvelle ! J'ai récemment participé à une compétition sportive avec mon club, et j'ai eu la chance de remporter la première place.

La compétition était assez difficile, avec des participants très motivés et bien entraînés. J'ai dû donner le meilleur de moi-même pour réussir. Heureusement, grâce à mes efforts et au soutien de mon entraîneur, j'ai pu atteindre mon objectif.

Ce moment a été très intense et rempli d'émotions. Je suis vraiment fier de ce résultat et cela me motive à continuer à progresser.

J'espère qu'on pourra fêter ça ensemble très bientôt !

À bientôt,
Charlène`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Le site « colocation.com » recherche des témoignages sur vos expériences de colocation. Écrivez-nous ! Vous avez déjà habité en colocation avec des amis. Vous racontez votre expérience aux membres du site internet. Vous donnez votre opinion sur ce mode de logement.",
        titre_corrige: "Une expérience de colocation enrichissante mais exigeante",
        corrige: `Bonjour à tous,

Il y a quelques années, j'ai eu l'occasion de vivre en colocation avec deux amis pendant mes études. Au départ, cette expérience me semblait idéale, car elle permettait de partager les dépenses et de ne pas vivre seul.

Au quotidien, l'ambiance était généralement conviviale. Nous partagions les repas, les moments de détente et parfois même les tâches ménagères. Cela m'a permis de créer des souvenirs agréables et de renforcer mes liens d'amitié. Cependant, tout n'était pas toujours facile. Les différences d'habitudes et d'organisation pouvaient entraîner des conflits, notamment concernant le ménage ou le bruit. Il fallait donc faire preuve de patience et de communication.

En ce qui me concerne, je pense que la colocation est une expérience enrichissante, à condition de respecter certaines règles. D'ailleurs, je la recommande vivement ; car elle permet de développer le sens du partage et de la responsabilité.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `De nos jours, les villes grossissent toujours plus. Malheureusement, ce phénomène a un impact fort sur l'environnement, car plus une ville grossit, plus elle a des effets négatifs sur la nature et donc, ensuite, sur l'homme. L'effet négatif le plus visible est la déforestation, qui diminue les végétaux qui retiennent le carbone. Donc, quand on les supprime pour construire des bâtiments ou des rues, on supprime des espaces verts capables de retenir des millions de tonnes de carbone.`,
        document2: `Plus de la moitié de l'humanité vit en ville (huit habitants sur dix dans les pays riches). La vie urbaine est donc le principal enjeu écologique. On entend souvent dire que l'organisation actuelle des villes n'est pas écologique, et que le grossissement des villes ne fait qu'augmenter le problème. Pourtant, il faut se méfier des apparences : les villes ne sont pas toujours aussi antiécologiques qu'on l'imagine. Par exemple, la consommation d'énergie d'un citadin est moins importante que celle d'un habitant de la campagne.`,
        titre_corrige: "Le grossissement des villes : une menace ou une opportunité écologique ?",
        corrige: `Les documents présentent deux visions du développement des villes. D'un côté, l'urbanisation croissante a des conséquences négatives sur l'environnement. La déforestation, liée à la construction d'infrastructures, réduit les espaces verts capables d'absorber le carbone, ce qui aggrave les problèmes climatiques. D'un autre côté, certains soulignent que la vie urbaine peut être plus écologique qu'on ne le pense. En effet, les citadins consomment souvent moins d'énergie que les habitants des zones rurales, notamment grâce à la proximité des services et aux transports en commun.

À mon avis, le grossissement des villes représente à la fois un défi et une opportunité. Par exemple, si les autorités développent des villes durables avec des espaces verts et des transports écologiques, il est possible de réduire l'impact environnemental tout en répondant aux besoins de la population. En conclusion, les villes ne sont pas forcément nuisibles à l'environnement, mais leur développement doit être mieux encadré pour devenir plus durable.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 4,
    taches: [
      {
        numero: 1,
        consigne: "Écrivez un message à vos amis pour les inviter à votre anniversaire et leur raconter comment va se dérouler votre fête.",
        corrige: `Salut les amis,

J'espère que vous allez bien ! Je vous écris pour vous inviter à mon anniversaire qui aura lieu ce samedi soir chez moi. J'aimerais vraiment que vous soyez présents pour célébrer ce moment avec moi.

La fête commencera vers 18h. Au programme, il y aura de la musique, des jeux, et bien sûr un bon repas. J'ai aussi prévu un gâteau spécial et quelques surprises pour rendre la soirée encore plus agréable.

L'ambiance sera conviviale et détendue, parfaite pour passer un bon moment ensemble.

Merci de me confirmer votre présence à l'avance.

À très bientôt, j'ai hâte de vous voir !

Paul`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Répondez en commentaire d'une publication sur Facebook au sujet des études à l'étranger en citant les avantages et les inconvénients de cette expérience.",
        titre_corrige: "Étudier à l'étranger : une expérience inédite",
        corrige: `Bonjour à tous,

Je me souviens encore de mon expérience d'études à l'étranger, qui a été à la fois enrichissante et pleine de défis. Au début, j'étais très enthousiaste à l'idée de découvrir un nouveau pays, une autre culture et d'améliorer mon niveau de langue. Très vite, j'ai gagné en autonomie et en confiance, car je devais gérer seul mon quotidien.

Cependant, tout n'a pas été facile. Les premières semaines ont été marquées par le manque de ma famille et de mes amis. Je me sentais parfois seul, surtout dans un environnement totalement différent. De plus, le coût de la vie était assez élevé, ce qui m'a obligé à bien gérer mon budget.

Malgré ces difficultés, cette expérience m'a beaucoup appris. Aujourd'hui, je pense que partir étudier à l'étranger est une opportunité unique qui permet de grandir personnellement et professionnellement. Lancez-vous si vous en avez l'occasion !`,
        mots_indicatif: 140,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `Les enfants de l'école primaire peuvent utiliser la technologie pour trouver des vidéos sur les sujets qu'ils ont étudiés à l'école ou pour jouer à des jeux qui améliorent leur aisance en mathématiques, leur compréhension de la lecture ou leurs compétences en dactylographie.`,
        document2: `Les nouvelles technologies encouragent les enfants à être sédentaires. C'est une préoccupation majeure pour les parents. Cela ne mène à aucun jeu libre créatif, à aucune interaction sociale face à face, conduisant à aucun effort physique ! Pourquoi ne pas essayer certaines de ces activités amusantes pour encourager vos enfants à ranger leurs appareils ?`,
        titre_corrige: "Les nouvelles technologies pour les enfants : outil éducatif ou danger pour leur développement ?",
        corrige: `Les documents présentent deux visions des nouvelles technologies chez les enfants. D'un côté, elles peuvent être un outil éducatif efficace. En effet, les enfants de l'école primaire peuvent utiliser des vidéos pour mieux comprendre leurs leçons ou des jeux éducatifs pour améliorer leurs compétences en mathématiques, en lecture ou en dactylographie. Ces outils rendent l'apprentissage plus interactif et motivant. D'un autre côté, certains parents s'inquiètent de leurs effets négatifs. L'utilisation excessive des écrans peut rendre les enfants plus sédentaires et réduire leurs activités physiques. Elle limite aussi les jeux créatifs et les interactions sociales en face à face, pourtant essentiels à leur développement.

À mon avis, les technologies sont utiles si elles sont utilisées avec modération et encadrées par les parents. Par exemple, un enfant peut utiliser une tablette pour apprendre pendant une heure, puis participer à une activité sportive ou à un jeu en groupe. En conclusion, les nouvelles technologies ne sont pas mauvaises en soi, mais leur usage doit être équilibré pour favoriser le développement harmonieux des enfants.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 5,
    taches: [
      {
        numero: 1,
        consigne: "Écrivez un message à vos amis pour leur proposer de passer un week-end avec vous pour faire du sport.",
        corrige: `Salut les amis,

J'espère que vous allez bien ! Je vous écris pour vous proposer de passer un week-end ensemble afin de faire du sport et de nous détendre un peu. Je pense que ce serait une excellente occasion de nous retrouver et de partager un bon moment.

Au programme, nous pourrions faire du football le samedi matin, puis une séance de fitness ou de course à pied l'après-midi. Le dimanche, nous pourrions organiser une petite randonnée ou même une activité plus relaxante comme des étirements en plein air.

Ce week-end sportif nous permettra de nous amuser tout en prenant soin de notre santé.

Dites-moi rapidement si vous êtes disponibles. J'espère vraiment que vous pourrez venir !

À très bientôt,
Stéphane`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Écrivez un article de blog sur un forum pour raconter pourquoi vous avez décidé de changer vos habitudes alimentaires.",
        titre_corrige: "Changer ses habitudes alimentaires : une décision bénéfique au quotidien",
        corrige: `Chers lecteurs,

Il y a quelques mois, j'ai pris la décision de modifier mes habitudes alimentaires après avoir ressenti une fatigue constante et un manque d'énergie. En observant mon mode de vie, j'ai réalisé que je consommais trop de produits transformés et peu d'aliments équilibrés.

Progressivement, j'ai commencé à intégrer davantage de fruits, de légumes et de repas faits maison dans mon alimentation. Les débuts n'ont pas été faciles, car il fallait changer certaines habitudes bien ancrées. Cependant, au fil du temps, j'ai remarqué une amélioration de ma santé et de mon bien-être général. Aujourd'hui, je me sens plus énergique et en meilleure forme. Ce changement a eu un impact positif sur mon quotidien.

En conclusion, je recommande vivement aux lecteurs d'adopter une alimentation plus saine, en procédant par étapes, afin de garantir des résultats durables.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `La sieste au travail peut avoir de nombreux avantages pour les employés et les entreprises. En permettant aux travailleurs de faire une petite sieste, cela peut aider à augmenter leur productivité et à améliorer leur santé et leur bien-être. Les siestes courtes peuvent aider à améliorer la vigilance et la concentration, réduire les niveaux de stress et améliorer l'humeur. En outre, la pratique de la sieste peut aider à réduire les coûts pour les employeurs en diminuant les coûts liés à la fatigue et aux accidents du travail. Il est donc important pour les entreprises de considérer les avantages potentiels de la sieste au travail et d'envisager d'offrir cette option à leur personnel.`,
        document2: `Malgré les nombreux avantages de la sieste au travail, il peut être difficile pour toutes les entreprises de mettre en place des lits et des salles dédiées à cette pratique. Cela peut être dû à des contraintes financières ou logistiques, ou encore à des politiques de travail strictes qui ne permettent pas aux employés de faire des siestes pendant les heures de travail. En outre, certains travailleurs peuvent ne pas se sentir à l'aise de faire une sieste au travail, ce qui peut limiter l'adoption de cette pratique.`,
        titre_corrige: "La sieste au travail : une pratique bénéfique mais difficile à mettre en place",
        corrige: `Les documents présentent deux points de vue sur la sieste au travail. D'un côté, elle offre de nombreux avantages pour les employés et les entreprises. Elle permet d'améliorer la concentration, de réduire le stress et d'augmenter la productivité. De plus, elle peut diminuer les accidents liés à la fatigue et favoriser le bien-être général des travailleurs. D'un autre côté, sa mise en place reste compliquée pour certaines entreprises. Des contraintes financières et logistiques peuvent empêcher l'installation d'espaces dédiés. Par ailleurs, certaines politiques internes ou le malaise de certains employés peuvent limiter son adoption.

À mon avis, la sieste au travail est une pratique bénéfique qui mérite d'être encouragée. Par exemple, une courte pause de 15 minutes peut aider un employé à retrouver de l'énergie et à être plus efficace pour le reste de la journée. En conclusion, même si sa mise en œuvre présente des défis, la sieste au travail constitue une solution intéressante pour améliorer la performance et le bien-être des employés.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 6,
    taches: [
      {
        numero: 1,
        consigne: "Vous envisagez de déménager et avez trouvé un appartement. Vous souhaitez en informer un ami en lui fournissant les détails concernant le bien en question : nombre de pièces, emplacement et prix.",
        corrige: `Salut Paul,

J'espère que tu vas bien ! Je voulais t'annoncer une bonne nouvelle : j'ai trouvé un appartement et je pense sérieusement à déménager bientôt.

C'est un logement très agréable composé de trois pièces : un salon spacieux, une chambre confortable et une cuisine bien équipée. Il est situé dans un quartier calme, proche du centre-ville et des transports en commun, ce qui est très pratique pour mes déplacements.

En ce qui concerne le prix, le loyer est raisonnable par rapport aux prestations offertes, même s'il représente un certain budget.

Je suis vraiment enthousiaste à l'idée de m'y installer. J'espère que tu pourras venir le visiter une fois que je serai installé !

À bientôt,
Julie`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Une annonce de festival de musique gratuit a été publiée dans votre ville, et vous avez profité de cette occasion pour y assister avec votre ami. Écrivez un article de blog pour raconter l'expérience que vous avez vécue lors de cet événement musical.",
        titre_corrige: "Un festival de musique gratuit aux émotions inoubliables",
        corrige: `Chers lecteurs,

Le week-end dernier, j'ai eu la chance d'assister à un festival de musique gratuit dans ma ville, accompagné d'un ami. Dès notre arrivée, l'ambiance était exceptionnelle : une foule enthousiaste, des stands colorés et une scène déjà animée par des artistes locaux.

Tout au long de la journée, plusieurs groupes se sont succédé, proposant des styles variés, allant du rap à la musique traditionnelle. Cette diversité a rendu l'événement encore plus captivant. À un moment, un artiste très apprécié du public est monté sur scène, déclenchant une véritable explosion de joie. Au-delà des performances, ce festival a été une belle occasion de partager des moments conviviaux et de découvrir de nouveaux talents.

En conclusion, cette expérience restera gravée dans ma mémoire. Je recommande vivement à tous de participer à ce type d'événements lorsqu'ils en ont l'opportunité.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `De nombreux jeunes diplômés de l'université se retrouvent au chômage. La reconnaissance des formations universitaires sur le marché du travail soulève des questions. En effet, les jeunes rencontrent souvent des difficultés pour trouver un emploi : les recruteurs leur reprochent d'avoir trop de diplômes et pas assez d'expérience, ou bien leur jeunesse constitue un obstacle. Plus de 60 % des jeunes diplômés n'ont toujours pas trouvé de travail un an après la fin de leurs études. Dans ce contexte, il semble urgent de revaloriser les diplômes et de favoriser l'emploi et la croissance.`,
        document2: `On entend souvent parler de célèbres chefs d'entreprise qui ont réussi sans aller à l'université. L'exemple de ces personnalités riches et admirées pourrait laisser croire qu'il suffit d'être brillant pour diriger une entreprise. Certains dirigeants estiment même que les études universitaires peuvent être un frein. Selon eux, l'université enseigne le conformisme et limite la créativité en incitant les étudiants à suivre des parcours classiques.`,
        titre_corrige: "Les études universitaires : un atout ou un obstacle à la réussite ?",
        corrige: `Les documents présentent deux visions opposées de l'utilité des études universitaires. D'un côté, le premier texte souligne les difficultés rencontrées par les jeunes diplômés sur le marché du travail. Malgré leurs qualifications, beaucoup peinent à trouver un emploi en raison d'un manque d'expérience ou de leur jeune âge. Cela remet en question la valeur des diplômes. D'un autre côté, le second document met en avant des exemples de réussite sans études universitaires. Certains estiment que l'université limite la créativité et favorise le conformisme, tandis que l'expérience et l'autoformation seraient plus efficaces pour entreprendre.

À mon avis, les études universitaires restent importantes, mais elles doivent être complétées par une expérience pratique. Par exemple, un étudiant qui effectue des stages pendant son cursus augmente considérablement ses chances d'insertion professionnelle. En conclusion, les diplômes sont utiles, mais ils ne suffisent pas à garantir la réussite sans expérience et esprit d'initiative.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 7,
    taches: [
      {
        numero: 1,
        consigne: "Votre ami Alex vous a envoyé ce message : « Salut, comment ça va ? Alors, comment est la nouvelle université ? Est-ce que les étudiants sont sympas ? Comment sont les profs ? À bientôt. Alex ». Vous répondez à Alex dans un message où vous décrivez votre université (professeurs, étudiants, activités, etc.).",
        corrige: `Salut Alex,

Ça va super, merci ! Ma nouvelle université est impressionnante. Le campus est moderne et très dynamique. Les professeurs sont vraiment passionnés et accessibles, ce qui rend les cours captivants. Quant aux étudiants, ils sont très accueillants ; je me suis déjà fait quelques amis lors d'une soirée d'intégration. En plus des cours, il y a énormément d'activités : je me suis inscrit au club de sport et à un atelier de théâtre. C'est un environnement vraiment stimulant.

On se voit bientôt pour que je te raconte tout ça en détail ?

Amitiés,
Paul`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez décidé de ne plus utiliser votre réseau social préféré (Instagram, Facebook, etc.). Vous écrivez à vos amis pour leur raconter cette expérience et expliquer pourquoi vous avez pris cette décision.",
        titre_corrige: "Le Déclic : Ma Vie Sans Écran",
        corrige: `Salut les amis,

En janvier dernier, ici à Yaoundé, j'ai pris une décision radicale : supprimer définitivement l'application Instagram de mon téléphone. Fatigué de passer des heures à faire défiler des photos superficielles, j'ai choisi de privilégier la réalité. Ce changement s'est opéré par une déconnexion totale. Au début, j'ai ressenti un manque, mais j'ai vite découvert comment réoccuper ce temps libre. J'ai remplacé les « likes » par de longues discussions en terrasse et des lectures passionnantes. Ma concentration s'est nettement améliorée et mon stress a diminué, car je ne me compare plus aux vies filtrées des autres. Je me sens enfin acteur de mes journées plutôt que simple spectateur. Si vous vous sentez parfois épuisés par le monde numérique, je vous recommande vivement de tenter l'expérience et de redécouvrir les plaisirs simples de l'instant présent.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Une étude montre que seulement 2 % des recruteurs se basent sur la photo pour sélectionner un candidat, contre 32 % qui privilégient l'expérience professionnelle et 15 % les diplômes. Il faudrait interdire les photos sur les CV pour éviter les discriminations et les biais liés à l'apparence physique des candidats.",
        document2: "La question de la photo sur le CV divise les employeurs. Pour certains, la photo permet de mieux se représenter la personne avant de la rencontrer. De plus, une photo professionnelle peut donner une impression positive et humaniser le profil d'un candidat, facilitant ainsi sa mémorisation par le recruteur.",
        titre_corrige: "Le CV anonyme : l'apparence au service de la compétence ?",
        corrige: `Le débat sur l'intégration d'une photographie dans les dossiers de candidature reste vif. Tandis que le premier document souligne l'aspect discriminatoire et l'impact marginal de l'image face aux compétences techniques, le second suggère qu'elle peut humaniser un profil professionnel. À mon avis, l'interdiction de la photo sur le curriculum vitae est une mesure nécessaire pour garantir l'équité. Bien que l'on puisse arguer qu'elle facilite la mémorisation d'un candidat, elle laisse surtout la porte ouverte à des biais inconscients liés à l'ethnicité ou à l'apparence physique. Dans un processus de recrutement juste, seule l'adéquation entre le profil et les exigences du poste devrait compter. Comme le montrent les statistiques, l'expérience reste le critère prépondérant ; la photo n'est donc qu'une distraction superflue qui risque de fausser le jugement du recruteur.

En conclusion, si la photo apporte une touche personnelle, les risques de dérives discriminatoires l'emportent sur ses avantages pratiques. Valoriser les compétences plutôt que l'esthétique est le seul chemin vers un marché du travail véritablement égalitaire.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 8,
    taches: [
      {
        numero: 1,
        consigne: "Vous allez déménager à Nice, en France. Vous écrivez un message sur le site d'une agence immobilière. Vous donnez les informations nécessaires (superficie, budget, nombre de pièces, etc).",
        corrige: `Objet : Recherche d'un appartement

Bonjour,

Je vous contacte via votre site car je vais bientôt déménager à Nice et je suis à la recherche d'un logement.

Je souhaiterais un appartement de type deux ou trois pièces, avec une superficie d'environ 50 à 70 m². J'aimerais qu'il dispose d'une chambre confortable, d'un salon lumineux et, si possible, d'un balcon. Une cuisine équipée serait également appréciée.

Mon budget est d'environ 800 à 1000 euros par mois. Je privilégie un logement situé dans un quartier calme, mais proche des transports en commun et des commerces.

Je prévois de m'installer dans un délai d'un mois.

Merci de me contacter si vous avez des offres correspondant à mes critères.

Cordialement,
Nicaise`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez commencé à prendre des cours dans une école de langues. Vous envoyez un message à vos amis pour leur raconter comment s'est passée votre première semaine. Parlez de votre impression sur l'école et sur vos cours.",
        titre_corrige: "Ma première semaine dans une école de langues",
        corrige: `Coucou les amis,

J'ai récemment commencé des cours dans une école de langues et je voulais partager avec vous mes premières impressions. Dès mon arrivée, j'ai été bien accueilli par l'équipe pédagogique, ce qui m'a tout de suite mis en confiance.

Les cours se déroulent dans une ambiance dynamique et interactive. Nous travaillons beaucoup l'expression orale, ce qui m'aide à progresser rapidement. Le professeur est très patient et utilise des méthodes modernes, avec des activités de groupe et des exercices pratiques. Au début, j'étais un peu stressé, car je ne savais pas à quoi m'attendre. Cependant, après quelques jours, je me suis senti plus à l'aise et motivé. En ce qui concerne l'école, elle est bien organisée et les salles sont confortables.

Je suis très satisfait de cette première semaine et j'ai hâte de continuer à progresser.

À très vite,
Karl`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `De nos jours, il y a de plus en plus de caméras de surveillance dans les villes. La vidéosurveillance est appréciée par les Français car cela leur donne un sentiment de sécurité. D'après un sondage, 75 % d'entre eux sont pour le développement de la vidéosurveillance. Ils seraient d'accord pour être filmés, mais seulement dans l'espace public : la rue, les magasins ou encore les transports. Cependant, ils refusent d'être surveillés par leur employeur. En France, peu de caméras de vidéosurveillance sont installées sur le lieu de travail.`,
        document2: `Certaines enquêtes montrent que la vidéosurveillance coûte cher et que ses résultats sont insuffisants. D'une part, la présence des caméras est facile à remarquer. Par conséquent, la vidéosurveillance est inutile pour éviter les vols, la consommation de drogue et la violence dans les villes. D'autre part, l'utilisation de la vidéosurveillance demande beaucoup de personnel. Une étude allemande montre que sept personnes par caméra sont nécessaires pour analyser les informations.`,
        titre_corrige: "La vidéosurveillance : un outil de sécurité efficace ou coûteux et limité ?",
        corrige: `Les documents présentent deux points de vue sur la vidéosurveillance. D'un côté, elle est largement appréciée par la population, car elle renforce le sentiment de sécurité dans les espaces publics comme les rues, les transports ou les magasins. Une grande majorité de personnes se disent favorables à son développement, même si elles refusent généralement d'être filmées sur leur lieu de travail. D'un autre côté, certains experts soulignent ses limites. En effet, la vidéosurveillance serait coûteuse et peu efficace. Les caméras étant visibles, elles ne permettent pas toujours de prévenir les comportements délinquants. De plus, leur exploitation nécessite beaucoup de personnel pour analyser les images, ce qui augmente encore les coûts.

À mon avis, la vidéosurveillance peut être utile pour renforcer la sécurité, mais elle ne doit pas être la seule solution. Par exemple, elle peut être combinée avec une présence policière renforcée pour plus d'efficacité. En conclusion, la vidéosurveillance est un outil intéressant, mais son efficacité dépend de son utilisation et de son encadrement.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 9,
    taches: [
      {
        numero: 1,
        consigne: "Rédigez un message pour inviter votre ami(e) à passer ses vacances dans votre ville en précisant les lieux et les endroits à visiter.",
        corrige: `Salut Sophie,

J'espère que tu vas bien ! Je t'écris pour t'inviter à passer tes prochaines vacances dans ma ville. Ce serait vraiment un plaisir de t'accueillir et de te faire découvrir les plus beaux endroits.

Tu pourras commencer par visiter le centre-ville, qui est très animé avec ses marchés, ses restaurants et ses boutiques. Ensuite, je te conseille le grand parc naturel situé à proximité, idéal pour se promener et se détendre. Nous pourrons aussi aller au musée principal pour découvrir l'histoire de la région.

Si tu aimes les paysages, il y a également un lac magnifique à quelques kilomètres, parfait pour une journée en plein air.

J'espère vraiment que tu pourras venir !

À très bientôt,
Élie`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez participé à un concours pour gagner un séjour de deux semaines dans votre ville préférée. Le thème de ce concours est « Mon artiste préféré ». Écrivez un article de blog pour parler de votre artiste préféré.",
        titre_corrige: "Mon artiste préféré : une source d'inspiration au quotidien",
        corrige: `Chers lecteurs,

J'ai récemment participé à un concours ayant pour thème « Mon artiste préféré », et cela m'a donné l'occasion de réfléchir à celui qui m'inspire le plus.

Depuis que je l'ai découvert, j'ai été immédiatement touché par son style unique et la profondeur de ses textes. Ses chansons abordent des thèmes variés comme la vie, l'espoir et les difficultés du quotidien, ce qui les rend très proches de la réalité. Au fil du temps, j'ai suivi son évolution et j'ai eu la chance d'assister à un de ses concerts. L'ambiance était incroyable : le public chantait en chœur et l'artiste partageait une véritable connexion avec ses fans.

En conclusion, cet artiste représente pour moi une grande source de motivation et d'émotion. Sa musique m'aide à avancer et à rester positif dans les moments difficiles.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `"Je suis de ceux qui n'arrivent pas à comprendre comment l'on peut prendre du plaisir à tuer des animaux. Je suis de ceux qui n'arrivent pas à comprendre comment on peut prétendre aimer la nature alors qu'on la détruit" — Gala, 29 ans`,
        document2: `"Les gens chassent pour différentes raisons : la subsistance, le commerce, la conservation et l'aménagement de la faune, la protection de la propriété, l'exercice, le loisir et le prestige." — David, journaliste de la FRM`,
        titre_corrige: "La chasse aux animaux : activité cruelle ou pratique utile ?",
        corrige: `Les documents présentent deux visions opposées de la chasse. D'un côté, certains dénoncent cette pratique, estimant qu'il est difficile de comprendre le plaisir de tuer des animaux. Selon eux, la chasse est incompatible avec le respect de la nature, car elle contribue à la destruction de la faune et va à l'encontre de la protection de l'environnement. D'un autre côté, la chasse est présentée comme une activité ayant plusieurs fonctions. Elle peut répondre à des besoins de subsistance, de régulation de la faune ou encore de protection des cultures et des propriétés. Elle est également pratiquée comme loisir ou pour des raisons économiques et culturelles.

À mon avis, la chasse ne devrait être autorisée que dans des cas strictement nécessaires, notamment pour réguler certaines espèces et préserver l'équilibre écologique. Par exemple, dans certaines régions, la surpopulation d'animaux peut provoquer des dégâts importants sur les cultures. En conclusion, la chasse est une pratique controversée qui doit être encadrée afin de limiter ses impacts négatifs sur les animaux et la nature.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 10,
    taches: [
      {
        numero: 1,
        consigne: "« Je cherche un vélo en bon état et bon marché. Contactez-moi par courriel : mathieu@gmail.com ». Vous avez un vélo à vendre. Vous écrivez un courriel pour décrire votre vélo et proposer un prix. Vous lui donnez un rendez-vous pour essayer le vélo.",
        corrige: `Objet : Un vélo à vendre

Bonjour Mathieu,

Je fais suite à votre annonce concernant la recherche d'un vélo en bon état et à petit prix. Je vous propose le mien, qui pourrait vous intéresser.

Il s'agit d'un vélo de ville de marque Decathlon, en très bon état, utilisé seulement pendant deux ans. Il est confortable, solide et idéal pour les déplacements quotidiens. Les freins et les vitesses fonctionnent parfaitement, et les pneus ont récemment été changés.

Je le vends au prix de 120 euros, légèrement négociable si besoin.

Si vous êtes intéressé, je vous propose un rendez-vous ce samedi après-midi vers 15h afin que vous puissiez l'essayer. Nous pourrons nous retrouver devant le parc central, qui est un endroit pratique et calme.

Dans l'attente de votre réponse.

Cordialement,
Caroline`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez passé une journée à la campagne avec vos amis. À votre retour, vous écrivez un message sur votre forum pour raconter à vos amis comment cette journée s'est passée. Vous expliquez ce que vous avez aimé (activités, lieu, animaux, etc...).",
        titre_corrige: "Une journée inoubliable à la campagne",
        corrige: `Salut les amis,

Hier, j'ai passé une merveilleuse journée à la campagne avec mes amis, et je souhaite partager cette belle expérience avec vous. Nous sommes partis tôt le matin pour profiter pleinement de la journée. Dès notre arrivée, nous avons été séduits par le calme, la verdure et l'air pur, loin du bruit de la ville.

Au cours de la journée, nous avons fait une longue promenade à travers les champs et les forêts. Nous avons également pique-niqué au bord d'une petite rivière, ce qui était très agréable et reposant. Plus tard, nous avons eu la chance d'observer quelques animaux comme des moutons, des vaches et même des chevaux en liberté. Ce que j'ai le plus aimé, c'est la tranquillité du lieu et les moments de partage avec mes amis. Nous avons beaucoup ri et pris de nombreuses photos pour immortaliser cette sortie.

Cette journée à la campagne restera un excellent souvenir que j'aimerais revivre très bientôt. Je vous recommande vivement ce genre d'expérience.

À bientôt,
Paulin`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `Je vais bientôt avoir 22 ans et j'habite toujours chez mes parents. Mon père et ma mère restent autoritaires avec moi, même si je suis majeure. Quand j'étais mineure, je n'avais pas le droit de dormir dehors, ni même de dépasser 21h lorsque je sortais avec des amies. Maintenant, peu de choses ont changé ; certes, j'ai le droit de veiller plus tard la nuit, mais ma mère ne cesse de m'appeler sur mon téléphone portable jusqu'à ce que je sois de retour.`,
        document2: `Les parents ont parfois peur d'être trop sévères avec leurs enfants. Ils craignent qu'à cause d'un excès d'autorité, leurs enfants ne s'épanouissent pas et manquent plus tard de personnalité. Même si les parents acceptent, par amour, tout ce que leurs enfants demandent, cela pourrait avoir des effets négatifs lorsqu'ils passent à l'âge adulte. En effet, pour vivre en communauté, il y a certaines règles à respecter.`,
        titre_corrige: "La sévérité des parents : autorité excessive ou nécessité éducative ?",
        corrige: `Les documents présentent deux visions opposées de l'autorité parentale. D'un côté, certains jeunes estiment que leurs parents sont trop stricts, même à l'âge adulte. Les règles imposées, comme les horaires de sortie limités ou les appels fréquents, peuvent être perçues comme un manque de liberté et d'indépendance. D'un autre côté, d'autres points de vue expliquent que les parents hésitent parfois à être trop sévères par peur de freiner l'épanouissement de leurs enfants. Cependant, une absence de règles peut également avoir des conséquences négatives, car les jeunes doivent apprendre à respecter des normes pour vivre en société.

À mon avis, l'autorité parentale est nécessaire, mais elle doit être équilibrée. Par exemple, un adolescent peut bénéficier de règles claires tout en ayant progressivement plus de liberté selon son âge et sa maturité. En conclusion, la sévérité des parents est utile lorsqu'elle est adaptée et évolutive, afin de préparer efficacement les enfants à la vie adulte.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 11,
    taches: [
      {
        numero: 1,
        consigne: "Vous voulez changer la décoration de votre appartement (meubles, peinture, objets, etc.). Vous écrivez un message à un(e) ami(e). Vous lui décrivez votre projet et vous lui demandez de vous aider.",
        corrige: `Salut Laura,

J'espère que tu vas bien ! Je t'écris parce que j'ai décidé de changer la décoration de mon appartement. J'aimerais lui donner un style plus moderne et plus chaleureux.

Je pense commencer par repeindre les murs avec des couleurs claires, comme le blanc ou le beige, afin de rendre les pièces plus lumineuses. Ensuite, je voudrais remplacer certains meubles anciens par des meubles plus simples et fonctionnels. J'aimerais aussi ajouter quelques objets décoratifs comme des tableaux et des plantes pour rendre l'ensemble plus agréable.

J'aurais vraiment besoin de ton avis et de ton aide pour choisir les couleurs et les meubles. Tu as toujours de très bonnes idées en décoration !

Dis-moi quand tu seras disponible. Merci d'avance !

À bientôt,
Salma`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "« École de musique ! Cours gratuits, concerts, jeux. Rendez-vous vendredi, à partir de 9 heures ». Vous avez participé à cet évènement. Vous écrivez à vos amis pour raconter votre expérience et vous donnez votre opinion sur cette journée.",
        titre_corrige: "Une journée enrichissante à l'école de musique",
        corrige: `Salut les amis,

Vendredi dernier, j'ai participé à un événement organisé par une école de musique proposant des cours gratuits, des concerts et des jeux. Je souhaite vous raconter cette expérience très agréable.

Dès mon arrivée à partir de 9 heures, j'ai été accueilli dans une ambiance chaleureuse et festive. Nous avons commencé par assister à de petits ateliers où des professeurs nous ont initiés à différents instruments comme le piano et la guitare. Ensuite, plusieurs concerts ont été présentés par des élèves et des musiciens professionnels, ce qui était vraiment impressionnant. Dans l'après-midi, nous avons également participé à des jeux musicaux interactifs, ce qui a rendu la journée encore plus amusante et conviviale.

En conclusion, cette journée à l'école de musique a été une expérience très positive et enrichissante. Je la recommande vivement à tous ceux qui aiment la musique ou souhaitent découvrir cet univers.

À plus,
Fridolin`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: `Le supermarché est très pratique ; on y trouve une grande variété de produits, tous à portée de main. Vous pouvez garer votre voiture dans le parking et faire le tour des rayons pour acheter tout ce dont vous avez besoin : fruits, légumes, fromages, viandes, boissons... De plus, les supermarchés offrent plusieurs marques pour un même produit, tout en proposant régulièrement des promotions et des remises.`,
        document2: `ASSOCIATION POUR LA SAUVEGARDE DES PETITS COMMERCES — Le défi « Février sans supermarché » a été créé pour limiter la superpuissance des supermarchés et, par conséquent, permettre aux petits commerces de survivre et de réaliser des chiffres d'affaires plus conséquents. Ce défi consiste à boycotter les supermarchés pendant une durée d'un mois, en faisant toutes ses courses dans les épiceries de quartier. Le client aura tout à gagner : il bénéficiera non seulement de produits frais de meilleure qualité, mais aura également l'opportunité de papoter avec les voisins.`,
        titre_corrige: "Petits commerces ou Supermarchés pour les courses ?",
        corrige: `Les documents présentent deux points de vue sur le lieu idéal pour faire ses courses. D'un côté, les supermarchés sont jugés très pratiques, car ils offrent une grande variété de produits au même endroit. On peut y trouver tout ce dont on a besoin, des fruits aux produits ménagers, avec en plus des promotions régulières et plusieurs marques pour un même article. D'un autre côté, les petits commerces sont valorisés pour leur rôle économique et social. Ils permettent de soutenir les commerçants locaux et de préserver leur activité face à la domination des grandes surfaces. De plus, ils proposent souvent des produits plus frais et favorisent les échanges humains dans le quartier.

À mon avis, les deux options sont complémentaires. Par exemple, il est possible de faire ses courses principales en supermarché tout en achetant certains produits locaux chez les petits commerçants. En conclusion, le choix dépend des besoins, mais un équilibre entre les deux solutions semble idéal.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 12,
    taches: [
      {
        numero: 1,
        consigne: "Vous avez trouvé un nouveau travail. Vous écrivez à votre ami(e) francophone pour lui annoncer la nouvelle. Vous décrivez votre poste, vos collègues et votre lieu de travail.",
        corrige: `Salut Marc !

Je suis tellement contente de te donner cette nouvelle ! Depuis lundi, je suis responsable de projet dans une agence de marketing en centre-ville. Mes bureaux sont magnifiques, très lumineux et décorés de façon moderne. L'ambiance est excellente : mes collègues sont accueillants et font preuve d'un bel esprit d'équipe, ce qui facilite beaucoup mon intégration. Pour l'instant, mes missions sont passionnantes et correspondent exactement à l'environnement dynamique que je recherchais.

On se voit ce week-end pour fêter ça autour d'un verre ? J'ai hâte de te raconter tout cela de vive voix !

À très bientôt,
Géraldine`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Votre amie Julie envisage de faire des études à l'étranger mais hésite à cause de l'éloignement. Vous avez vous-même fait des études à l'étranger. Répondez à Julie en lui racontant votre expérience et en expliquant pourquoi cette décision vaut la peine d'être prise.",
        corrige: `Salut à tous !

Je m'appelle Alex et je reviens tout juste d'un séjour d'études d'un an à Lyon, en France, effectué durant l'année universitaire 2025. Cette expérience loin de ma famille a été une véritable révélation personnelle. Pour m'adapter, j'ai dû sortir de ma zone de confort quotidiennement. J'ai partagé un appartement avec trois étudiants de nationalités différentes, ce qui a été ma meilleure école de tolérance. Bien que le début ait été difficile à cause de l'isolement, j'ai adoré cette autonomie nouvelle. J'ai appris à gérer mon budget, à cuisiner et surtout, j'ai découvert une nouvelle culture de travail académique. Cette immersion m'a permis de gagner une maturité que je n'aurais jamais acquise en restant chez mes parents. Si tu souhaites réussir ton départ, Julie, je te recommande de t'inscrire immédiatement à des clubs étudiants dès ton arrivée.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Tous les ans, en hiver, je donne un peu de mon temps et de mon argent pour ceux qui sont dans le besoin. Je trouve très important de donner quelques euros à ces personnes ou aux associations qui peuvent les aider. Et puis, cette action me donne de la satisfaction et est à la portée de tout le monde.",
        document2: "Je suis bénévole dans l'association de mon quartier, où j'accompagne les sans-domicile fixe. Ces personnes ont besoin d'un soutien durable et d'un accompagnement vers le logement et l'emploi, pas seulement de quelques euros. Il est important d'agir avec conscience pour les aider à se réinsérer durablement dans la société.",
        titre_corrige: "Solidarité : simple aumône ou engagement durable ?",
        corrige: `La question du soutien aux plus démunis oppose deux visions de la charité. Le premier document prône l'aide financière ponctuelle comme un geste de solidarité accessible à tous, apportant un soulagement immédiat. À l'inverse, le second document critique cette pratique, la jugeant superficielle, et privilégie un accompagnement bénévole structuré visant l'autonomie par le logement et l'emploi.

À mon sens, bien que le don d'argent puisse paraître dérisoire, il demeure un filet de sécurité indispensable dans l'urgence. Certes, il est impératif de s'attaquer aux racines de la pauvreté par l'insertion professionnelle, comme le suggère le second auteur. Toutefois, tout le monde n'a pas la disponibilité nécessaire pour s'engager bénévolement au quotidien. Le don financier, loin d'être inutile, permet de financer les infrastructures des associations qui, précisément, aident ces personnes à se réinsérer. Les deux approches sont donc complémentaires plutôt qu'exclusives.

En conclusion, si l'engagement associatif offre des solutions pérennes, la générosité matérielle reste un acte de civisme essentiel. L'idéal réside dans une solidarité qui combine l'aide d'urgence et l'accompagnement vers l'indépendance.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 13,
    taches: [
      {
        numero: 1,
        consigne: "Vous souhaitez inviter votre ami Thomas à passer une journée avec vous. Écrivez-lui un message pour lui proposer une date, un lieu et des activités.",
        corrige: `Objet : Invitation : une journée détente ensemble !

Salut Thomas,

J'espère que tu vas bien. Je t'écris car j'aimerais t'inviter à passer la journée du samedi 15 mai avec moi. Je te propose de nous retrouver au parc floral dès 10 heures. Au programme : une petite randonnée matinale, suivie d'un pique-nique au bord du lac. L'après-midi, nous pourrions louer des vélos ou simplement nous détendre au soleil. C'est l'occasion idéale pour déconnecter et discuter tranquillement.

Dis-moi si tu es disponible et si ce programme te tente. J'ai vraiment hâte de te revoir !

À très bientôt,
Stéphanie`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez participé à une journée de formation dans votre entreprise. Écrivez un courriel à vos collègues pour raconter cette journée et exprimer ce que vous avez apprécié.",
        corrige: `Objet : Retour sur notre formation en marketing digital

Chers collègues,

Je tenais à partager avec vous mon expérience suite à la formation sur les stratégies de contenu à laquelle j'ai participé lundi dernier, dans nos locaux de Yaoundé. En tant que chef de projet, cette journée a été particulièrement enrichissante. Le formateur a alterné entre théorie et ateliers pratiques, ce qui nous a permis de tester immédiatement les outils d'intelligence artificielle. La qualité des échanges et la mise en situation réelle ont rendu l'apprentissage très concret. Cette immersion technologique m'a permis de mieux comprendre comment optimiser notre visibilité sur LinkedIn.

Je vous recommande vivement de suivre ce module lors de la prochaine session ; c'est une opportunité unique pour moderniser nos méthodes de travail et renforcer notre cohésion d'équipe.

Bien cordialement,
Georges`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "La vie en colocation exige des règles de base. Il est important de communiquer avec ses colocataires et d'établir des règles claires, car vous devrez partager la cuisine, le salon et la salle de bain. Cette organisation demande patience et tolérance pour maintenir une bonne entente au quotidien.",
        document2: "La colocation offre de nombreux avantages financiers. Elle peut inclure une maison avec jardin ou un grand appartement en centre-ville. En partageant le loyer et les charges avec vos colocataires, vous réduirez considérablement vos dépenses par rapport à un appartement individuel, tout en bénéficiant de logements bien plus spacieux et abordables.",
        titre_corrige: "Colocation : entre économies budgétaires et diplomatie domestique",
        corrige: `La vie en colocation soulève des enjeux tant relationnels que financiers. Alors que le premier document insiste sur la nécessité d'une communication rigoureuse et de règles strictes pour pallier les irritations quotidiennes, le second met en avant l'attrait économique de cette pratique, permettant d'accéder à des logements plus vastes et abordables malgré le partage des espaces communs.

À mon avis, la colocation est une solution d'habitation moderne qui exige une grande maturité. Si l'avantage pécuniaire est indéniable, notamment pour réduire les charges fixes, il ne doit pas occulter l'effort d'adaptation requis. Je pense que le succès de ce mode de vie repose moins sur la taille du logement que sur la capacité des membres à faire preuve de tolérance. Sans un respect mutuel des zones partagées et une gestion proactive des conflits, l'économie réalisée sur le loyer risque d'être rapidement entachée par une atmosphère délétère.

En conclusion, la colocation est une opportunité précieuse pour habiter mieux à moindre coût, à condition de privilégier l'humain sur le matériel. Une organisation structurée reste le rempart indispensable contre les dérives de la vie en communauté.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 14,
    taches: [
      {
        numero: 1,
        consigne: "Votre ami Cédric a accepté de garder votre maison et jardin pendant vos vacances. Vous lui laissez un message en lui expliquant ce qu'il y a à faire.",
        corrige: `Salut Cédric !

Encore merci d'avoir accepté de veiller sur ma maison pendant mes vacances. Voici quelques petites choses à faire : pourrais-tu arroser les plantes du salon et les fleurs du jardin tous les deux soirs ? Avec la chaleur actuelle, elles en ont vraiment besoin. Pense aussi à relever le courrier régulièrement.

N'hésite pas à te servir dans le réfrigérateur et à profiter de la terrasse ! Je te laisse les doubles des clés sous le paillasson. Appelle-moi si tu as le moindre souci.

À très vite et merci encore !
Joseph`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Suite à un voyage récent effectué avec une agence de voyages, vous êtes insatisfait(e) des prestations reçues. Rédigez un courriel de réclamation en exprimant votre mécontentement. Décrivez les problèmes rencontrés et demandez une solution à l'agence.",
        corrige: `Objet : Réclamation — Séjour à Kribi, Dossier n°458

Monsieur le Directeur,

Je me permets de vous contacter au sujet du séjour à Kribi auquel j'ai participé avec deux proches. Malheureusement, ce séjour a été marqué par de nombreuses déceptions concernant les prestations promises. Alors que nous avions réservé un hôtel de standing avec vue sur mer, nous avons été logés dans un établissement en travaux, bruyant et éloigné de la plage. De plus, le véhicule de transfert était en mauvais état. Malgré des appels répétés au guide local, aucune solution n'a été proposée sur place.

Je sollicite donc un remboursement partiel pour le préjudice subi. Je recommande vivement à votre agence de vérifier les avis récents sur les établissements partenaires afin d'éviter de telles déconvenues à vos futurs clients.

Dans l'attente de votre réponse, je vous prie d'agréer, Monsieur, mes salutations distinguées.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Les restaurants rapides proposent des plats équilibrés et variés. L'établissement affiche clairement les informations nutritionnelles sur son menu, et le client est donc responsable de ses propres choix alimentaires.",
        document2: "Les spécialistes affirment que manger régulièrement dans des restaurants de fast-food est dangereux pour la santé. La nourriture servie est souvent la même : frites, hamburgers et boissons sucrées. Ces aliments contiennent une grande quantité de calories, bien trop pour un seul repas. De plus, la plupart des produits dans ces restaurants sont emballés dans du plastique, augmentant la production de déchets.",
        titre_corrige: "Fast-food : entre liberté individuelle et responsabilité collective",
        corrige: `Le débat sur la restauration rapide oppose deux approches distinctes. Le premier document défend la qualité et la diversité des menus, tout en plaçant la responsabilité des choix alimentaires sur le consommateur lui-même. À l'inverse, le second document met en garde contre les dangers de ce mode de restauration pour la santé, notamment en raison de la prolifération des emballages plastiques polluants.

À mon avis, bien que les enseignes fassent des efforts de transparence, l'impact global du fast-food reste préoccupant. S'il est vrai que le client est libre de ses choix, la standardisation de menus riches en graisses et en sucres pousse à une consommation nocive sur le long terme. De plus, à l'heure de l'urgence climatique, nous ne pouvons ignorer la pollution générée par ces repas jetables.

En conclusion, si la restauration rapide offre une solution pratique, elle ne peut être considérée comme une alternative durable. Une régulation plus stricte de la qualité nutritionnelle et des emballages est nécessaire pour protéger l'intérêt général.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 15,
    taches: [
      {
        numero: 1,
        consigne: "Vous souhaitez faire du sport et vous voulez que votre ami vous accompagne. Écrivez-lui un message pour lui proposer de pratiquer ensemble.",
        corrige: `Salut Paul !

Je voulais te proposer quelque chose : je me suis dit que ce serait beaucoup plus motivant de pratiquer du sport ensemble. J'ai repéré une salle de fitness très bien équipée qui vient d'ouvrir près de chez nous. Ils proposent des cours collectifs variés le soir en semaine. Qu'en penses-tu ? On pourrait s'y retrouver pour se défouler après le travail tout en passant un bon moment.

Dis-moi ce que tu en penses, on pourrait aller visiter la salle samedi après-midi !

À bientôt,
Jeanne`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez effectué un séjour universitaire à Montréal. Sur votre blog, racontez cette expérience.",
        titre_corrige: "Ma parenthèse canadienne : une immersion inoubliable",
        corrige: `Bienvenue sur mon blog !

Aujourd'hui, je partage avec vous mon incroyable aventure universitaire vécue à Montréal en 2025. En tant qu'étudiant étranger, j'ai passé douze mois à découvrir le Québec et son accent légendaire. Le choc culturel a été immédiat, mais passionnant. J'ai dû apprendre à naviguer entre les cours magistraux et les travaux de groupe intenses. Ce qui m'a le plus marqué, c'est l'accessibilité des professeurs et la modernité des infrastructures. Au-delà des études, j'ai tissé des liens d'amitié avec des jeunes venus des quatre coins du monde.

Cette expérience a radicalement changé ma vision du monde et a renforcé mon autonomie. Si vous hésitez encore à partir, je vous recommande de ne pas viser uniquement les grandes métropoles : explorez les villes étudiantes de taille moyenne pour une immersion culturelle encore plus authentique !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Certains pensent que les jeunes devraient pouvoir s'exprimer à travers la mode, se démarquer de la foule grâce à un accessoire ou un vêtement. L'uniforme scolaire supprimerait cette liberté d'expression individuelle et pourrait nuire au développement de la personnalité des élèves.",
        document2: "L'uniforme scolaire renforce le sentiment d'appartenance à l'établissement et à la communauté des élèves. Il nourrit chez le jeune le sens du collectif et gomme les inégalités sociales liées aux familles qui peuvent ou non offrir de beaux vêtements griffés à leurs enfants.",
        titre_corrige: "Uniforme scolaire : contrainte vestimentaire ou levier d'égalité ?",
        corrige: `Le débat sur le port de l'uniforme oppose deux visions de l'éducation. Le premier document soutient que cette contrainte vestimentaire entrave la liberté d'expression et l'épanouissement de la personnalité des jeunes. À l'opposé, le second document souligne que l'uniforme renforce le sentiment d'appartenance à une communauté tout en gommant les inégalités sociales liées au pouvoir d'achat des familles.

À mon avis, l'uniforme constitue un levier d'intégration indispensable dans nos sociétés actuelles. Bien que l'on puisse regretter la perte d'une certaine créativité stylistique, il est primordial de protéger les élèves des discriminations et du harcèlement liés aux marques de vêtements. En uniformisant les apparences, l'école permet aux jeunes de se concentrer sur leurs compétences et leur caractère plutôt que sur leur image.

En conclusion, si l'uniforme limite l'expression individuelle, il favorise un climat scolaire plus serein et égalitaire. L'identité d'un élève devrait se forger par ses idées et non par les vêtements qu'il porte.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 16,
    taches: [
      {
        numero: 1,
        consigne: "Vous partez en vacances avec vos amis et avez trouvé un hôtel. Vous écrivez un message à vos amis pour décrire cet hôtel (localisation, prix, équipements, etc.) et vous leur proposez de réserver.",
        corrige: `Salut tout le monde !

J'ai trouvé un hôtel parfait pour notre séjour ! Il est idéalement situé à deux pas du centre historique et de la plage. Les tarifs sont très abordables : environ 60 euros par nuit avec le petit-déjeuner inclus. Côté équipements, il y a une connexion Wi-Fi gratuite, une salle de sport et surtout une magnifique piscine pour nous détendre après nos journées de visite.

Il reste quelques chambres disponibles à ce tarif préférentiel, donc dites-moi vite ce que vous en pensez pour que je puisse réserver !

À bientôt,
Jacques`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez commencé à travailler à Dubaï. Sur votre blog, racontez cette nouvelle expérience professionnelle et expliquez ce que vous avez le plus aimé.",
        titre_corrige: "Nouveau chapitre : Ma vie professionnelle à Dubaï",
        corrige: `Salut les amis !

Je ne regrette absolument pas mon choix. Au sein de mon agence, je collabore quotidiennement avec des collègues venant des cinq continents, et l'énergie qui règne ici est véritablement stimulante. La ville elle-même est une source d'inspiration permanente : ses gratte-ciel, sa modernité et son dynamisme économique m'ont immédiatement conquis. Ce que j'apprécie particulièrement, c'est le rythme de travail intense mais gratifiant, qui me pousse à me dépasser chaque jour.

Si vous avez l'opportunité de travailler à l'international, je vous recommande de foncer sans hésiter. C'est l'expérience idéale pour élargir ses horizons et booster sa carrière !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Des recherches montrent que certaines compétences, comme la réactivité, la coordination et la capacité à prendre des décisions rapides, peuvent être développées en jouant aux jeux vidéo. Une étude sur les joueurs actifs montre que 83 % d'entre eux sont des adultes. Cependant, il convient de rester prudent, car certains jeux ne favorisent pas ce type de développement cognitif.",
        document2: "Pendant trois ans, des enfants âgés de 8 à 17 ans ont participé à une étude sur les jeux vidéo. Les résultats montrent que les enfants qui jouent beaucoup aux jeux vidéo sont plus violents, plus nerveux et plus stressés que ceux qui ne jouent pas ou très peu.",
        titre_corrige: "Jeux vidéo : prouesse cognitive ou dérive comportementale ?",
        corrige: `La pratique vidéoludique suscite des avis divergents selon le public concerné. Le premier document souligne les bénéfices cognitifs chez les adultes, tels que l'amélioration de la réactivité et des capacités d'analyse. À l'opposé, le second document alerte sur les risques chez les mineurs, associant une consommation excessive à une hausse du stress, de la violence et à une baisse des performances scolaires.

À mon avis, les jeux vidéo sont des outils à double tranchant dont l'impact dépend de la maturité de l'utilisateur. S'il est indéniable que certains titres stimulent l'intellect et la prise de décision rapide chez l'adulte, ils peuvent s'avérer nocifs pour un cerveau en plein développement. Il ne s'agit pas de diaboliser ce média, mais d'adapter sa consommation : une pratique modérée et encadrée est essentielle pour tirer profit de ses avantages sans subir ses effets délétères.

En conclusion, si le jeu vidéo offre des opportunités de développement cérébral remarquables, la vigilance reste de mise. Un équilibre entre divertissement et discipline est impératif pour garantir une expérience bénéfique à tous les âges.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 17,
    taches: [
      {
        numero: 1,
        consigne: "Écrivez un message dans le journal de votre université pour rechercher un partenaire avec qui faire du sport.",
        corrige: `Objet : À la recherche d'un partenaire de tennis !

Bonjour à tous !

Étudiant en master, je cherche un partenaire motivé pour pratiquer le tennis ou le squash deux fois par semaine sur le campus. Mon objectif est de décompresser après les cours tout en restant actif. Peu importe votre niveau, l'essentiel est de passer un moment convivial et de progresser ensemble. Je suis généralement disponible les mardis et jeudis à partir de 17 heures.

Si vous êtes intéressé par quelques échanges de balles dans une ambiance détendue, n'hésitez pas à me contacter par message privé pour organiser notre première séance.

Au plaisir de vous lire et à bientôt sur le court !
Ayanne`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous venez d'arriver dans un pays étranger pour vos études. Écrivez un article de blog pour raconter votre arrivée et donner vos premières impressions.",
        titre_corrige: "Mes premiers pas sous le ciel de Montréal",
        corrige: `Bienvenue sur mon blog !

Il y a tout juste six mois, je débarquais au Canada pour une nouvelle aventure. Je me souviens encore de cet instant précis où j'ai franchi les portes de l'aéroport : un mélange d'excitation pure et d'appréhension. Dès mon arrivée, j'ai été frappé par l'immensité des espaces et la courtoisie légendaire des habitants. Alors que je cherchais désespérément mon chemin dans le métro, un passant s'est arrêté spontanément pour m'aider avec le sourire. C'était un contraste saisissant avec le tumulte auquel j'étais habitué. J'ai adoré l'architecture éclectique de la ville, où les gratte-ciel modernes côtoient de charmantes maisons en briques.

Malgré le froid qui commençait à piquer, la chaleur humaine m'a immédiatement conquis. Si vous prévoyez de vous expatrier, je vous recommande de voyager léger et de garder l'esprit ouvert : c'est la clé pour transformer chaque imprévu en un souvenir précieux.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "La télévision est un outil de communication et de divertissement largement répandu dans notre société moderne. Son influence est incontestable, tant sur les individus que sur la société. Elle peut offrir des divertissements variés et favoriser la diffusion de la culture. Présente dans de nombreux foyers, la télévision joue un rôle important dans la transmission des connaissances et la sensibilisation aux enjeux sociaux.",
        document2: "La télévision peut également présenter certains inconvénients. Les émissions télévisées peuvent parfois véhiculer des stéréotypes, des préjugés et des valeurs discutables. De plus, le temps passé devant la télévision peut réduire le temps consacré à d'autres activités plus enrichissantes, en particulier pour les enfants qui ont besoin d'activité physique et d'interactions sociales.",
        titre_corrige: "Le petit écran : vecteur de savoir ou frein à l'épanouissement ?",
        corrige: `La télévision demeure un média central dont l'utilité fait débat. Le premier document souligne sa puissance en tant qu'outil de divertissement et de diffusion culturelle, capable de sensibiliser un large public aux enjeux sociaux. À l'opposé, le second document met en garde contre les dérives potentielles, telles que la propagation de stéréotypes et la sédentarité, qui nuisent aux activités plus enrichissantes et au lien social.

À mon avis, si la télévision reste une fenêtre ouverte sur le monde, elle exige une consommation responsable. S'il est indéniable qu'elle facilite l'accès gratuit à l'information, elle peut aussi devenir un piège passif. Je pense que le danger ne réside pas dans l'outil lui-même, mais dans l'absence de recul critique. Pour que ce média demeure un levier d'apprentissage, il est essentiel de privilégier la qualité des programmes sur la quantité.

En conclusion, la télévision est un atout culturel majeur à condition d'être utilisée avec discernement. Savoir éteindre son poste est parfois le meilleur moyen de rester réellement connecté au monde.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 18,
    taches: [
      {
        numero: 1,
        consigne: "Votre ami(e) souhaite suivre des cours de langue dans votre école. Écrivez-lui un message pour lui donner les détails nécessaires (lieu, tarifs, types de cours disponibles, etc.) pour l'aider à faire son choix.",
        corrige: `Salut !

Je te recommande vraiment mon école de langues, idéalement située en plein centre-ville, juste à côté de l'arrêt de métro. Tu as l'embarras du choix pour les cours : ils proposent des sessions intensives le matin ou des cours du soir, parfaits si tu travailles. Ils préparent aussi spécifiquement aux examens officiels comme le TCF ou l'IELTS. Côté tarifs, comptez environ 150 euros par mois, mais il y a souvent des réductions pour les nouveaux inscrits.

Je te conseille vraiment cette école pour la qualité des professeurs et l'ambiance conviviale. On pourrait même y aller ensemble !

À très vite !
Séraphin`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous travaillez dans une association qui aide les personnes âgées. Rédigez un article de blog pour raconter vos expériences et convaincre d'autres personnes de rejoindre l'association.",
        titre_corrige: "Plus qu'un service, une leçon de vie",
        corrige: `Bienvenue sur mon blog !

Depuis six mois, je consacre mes week-ends à accompagner nos aînés dans une association locale. Ce qui n'était au départ qu'une simple envie d'aider est devenu une véritable passion. Je me souviens de ma rencontre avec Monsieur Abena. Alors que je l'aidais simplement pour ses courses, il a commencé à me raconter l'histoire de notre quartier dans les années 70. J'étais fasciné par sa mémoire et sa sagesse. Ces moments de partage sont incroyablement enrichissants ; on donne un peu de son temps, mais on reçoit énormément en retour.

J'ai découvert que briser l'isolement d'une personne âgée, c'est aussi préserver notre patrimoine vivant. Si vous avez quelques heures de libres, je vous recommande vivement de franchir le pas. Rejoindre notre équipe, c'est choisir l'humain et vivre des émotions d'une rare intensité !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Offrir un animal de compagnie à un enfant présente de nombreux avantages. Un animal, le plus souvent un chien ou un chat, favorise l'apprentissage de la responsabilité, de l'empathie et de la confiance en soi. La présence d'un animal permet à l'enfant de développer son autonomie et d'apprendre le respect d'autrui.",
        document2: "Même si vous avez envie de faire plaisir à votre enfant, un animal devient un nouveau membre de la famille et représente un engagement sur de nombreuses années. Son entretien demande du temps et de l'argent. Ce n'est pas un cadeau anodin et il ne faut pas céder à une demande enfantine de façon désintéressée.",
        titre_corrige: "Un animal pour mon enfant : cadeau éducatif ou fardeau familial ?",
        corrige: `L'adoption d'un animal de compagnie en milieu familial suscite des avis partagés. Le premier document met en avant les vertus psychologiques pour l'enfant, soulignant que l'animal favorise l'autonomie, la confiance en soi et l'apprentissage du respect d'autrui. À l'inverse, le second texte rappelle la réalité matérielle et éthique : un animal représente un coût financier important et un engagement à long terme qui ne doit en aucun cas être assimilé à un simple jouet.

À mon avis, l'intégration d'un animal est une opportunité éducative exceptionnelle, à condition qu'elle soit mûrement réfléchie par les parents. S'il est indéniable que la relation avec un chien ou un chat responsabilise l'enfant, la charge finale incombe toujours aux adultes. Je pense qu'il est primordial d'évaluer sa capacité financière et son temps disponible avant de céder à une demande enfantine.

En conclusion, si les bénéfices pour le développement de l'enfant sont réels, le bien-être animal doit rester la priorité. Une adoption réussie est avant tout une décision responsable et collective.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 19,
    taches: [
      {
        numero: 1,
        consigne: "Pour fêter la fin de l'année, vous organisez une soirée chez vous. Écrivez un message à vos amis pour les inviter en leur précisant la date, l'heure et ce qu'il faut apporter.",
        corrige: `Salut à tous !

Pour clore cette année en beauté, j'ai le plaisir de vous inviter à une petite fête chez moi le samedi 27 décembre à partir de 20 heures. Ce sera l'occasion idéale de nous retrouver autour d'un bon repas. Chacun peut apporter son plat ou sa boisson préférée pour compléter le buffet !

Merci de me confirmer votre présence avant le 20 décembre pour que je puisse m'organiser. J'ai vraiment hâte de vous revoir pour cette soirée qui s'annonce mémorable.

À très bientôt !
Mike`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez effectué un voyage au Canada avec une agence de voyages. Écrivez un commentaire sur le site de l'agence pour raconter votre expérience.",
        titre_corrige: "Un séjour canadien au-delà de mes attentes !",
        corrige: `Salut à tous,

Je reviens tout juste d'un voyage de deux semaines au Canada organisé par l'agence « Horizons Lointains », et l'expérience fut tout simplement magique. En février dernier, j'ai eu la chance de découvrir le Québec sous son manteau blanc, un vieux rêve qui s'est enfin réalisé. Dès mon arrivée à Montréal, j'ai été pris en charge par une équipe d'un professionnalisme exemplaire. Ce que j'ai particulièrement apprécié, c'est l'équilibre parfait entre les visites guidées et les moments de liberté. J'ai adoré l'excursion en traîneau à chiens dans les Laurentides ; c'était un moment de pure communion avec la nature.

Malgré le froid intense auquel je n'étais pas habitué, la chaleur de l'accueil québécois et la parfaite logistique de l'agence ont rendu ce séjour inoubliable. Si vous cherchez un dépaysement total sans soucis d'organisation, je vous recommande vivement ce circuit !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Avec des taux de pollution alarmants constatés dans plusieurs villes, la capitale de la Norvège, Oslo, a récemment opté pour l'interdiction des voitures dans son centre-ville. Cette mesure a permis de réduire significativement la pollution de l'air, les accidents de la route et la dépendance aux énergies fossiles.",
        document2: "Il n'est pas raisonnable de supprimer les voitures d'une zone urbaine sans mettre en place les outils et les infrastructures nécessaires pour réussir cette transition. En diminuant les voitures, on pollue moins, mais il faut prévoir de gigantesques parkings, développer davantage le transport en commun (métros et bus) et prévoir des autorisations de circulation pour certains corps de métier (police, urgentistes, livreurs, etc.).",
        titre_corrige: "Villes sans voitures : utopie écologique ou défi logistique ?",
        corrige: `La piétonnisation des centres-villes fait l'objet d'un vif débat. Le premier document présente cette mesure comme une réussite éclatante, prenant l'exemple d'Oslo pour souligner les bénéfices immédiats : réduction de la pollution, baisse des accidents et fin de la dépendance aux énergies fossiles. À l'opposé, le second document apporte une nuance cruciale en alertant sur le manque de préparation des infrastructures. Il insiste sur la nécessité de renforcer les transports en commun et de prévoir des exceptions pour les services d'urgence.

À mon avis, l'interdiction des voitures est une étape nécessaire pour la santé publique, à condition qu'elle soit accompagnée d'une planification rigoureuse. S'il est indéniable que la qualité de l'air s'améliore sans trafic, on ne peut ignorer les besoins de mobilité des citoyens. Une transition réussie exige des alternatives crédibles, comme des parkings relais efficaces et un réseau de bus performant.

En conclusion, si la fin de l'automobile en zone urbaine est un idéal souhaitable, elle doit rester pragmatique. Le succès d'une telle réforme repose sur l'équilibre entre ambition écologique et accessibilité urbaine.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 20,
    taches: [
      {
        numero: 1,
        consigne: "Vous allez fêter votre anniversaire. Envoyez un message à vos amis pour les inviter et leur décrire le programme de la soirée.",
        corrige: `Salut les amis !

Mon anniversaire approche et je compte fêter ça dignement le samedi 15 mai prochain dès 19 heures. Ce sera une soirée conviviale pour célébrer ensemble cette nouvelle année. Qui peut apporter de la musique pour la playlist ? Et qui pourrait apporter des chaises pliantes ?

Merci de me dire ce que vous pouvez faire et de confirmer votre présence avant lundi. On se voit très vite pour faire la fête !

Bisous,
Sidoine`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez participé à un concours de cuisine. Sur votre site internet, écrivez un court article pour raconter cette journée et expliquer pourquoi vous avez aimé cette expérience.",
        titre_corrige: "Sous le feu des projecteurs : mon défi culinaire",
        corrige: `Bienvenue sur mon site !

Me voilà face à mes limites, confronté à d'autres amateurs talentueux, avec seulement soixante minutes pour réaliser mon plat. L'ambiance était électrique : le cliquetis des ustensiles et l'odeur des épices créaient une tension palpable. Ce que j'ai le plus apprécié, c'est l'esprit de camaraderie et la bienveillance des chefs qui m'ont prodigué de précieux conseils techniques. Malgré le stress permanent, j'ai ressenti une immense fierté en présentant mon assiette finale.

Cette expérience m'a permis de gagner en confiance et de libérer ma créativité. Participer à ce type de concours est le meilleur moyen de progresser rapidement tout en vivant sa passion à 100 % !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Les vacances sont le moment où les jeunes se détendent après plusieurs mois d'études intenses. Certains jeunes décident cependant de ne pas prendre de vacances et choisissent de travailler : ils gardent des enfants, servent dans des restaurants ou ramassent des fruits. Même si le travail saisonnier présente des inconvénients, il prive surtout les jeunes d'un repos nécessaire et de temps précieux avec leurs proches.",
        document2: "Certains jeunes choisissent de travailler durant les vacances parce que cette expérience est un premier pas dans le monde professionnel. Ils apprennent à se responsabiliser tout en découvrant un métier. Recevoir un salaire les aide à devenir plus indépendants financièrement de leurs parents : ils pourront utiliser cet argent pour voyager ou se faire plaisir.",
        titre_corrige: "Travail saisonnier : tremplin financier ou sacrifice nécessaire ?",
        corrige: `La question du travail étudiant durant la période estivale divise l'opinion. Le premier document souligne que cet engagement prive les jeunes d'un repos essentiel et de moments précieux avec leurs proches, tout en pointant du doigt la pénibilité et la faible rémunération de certains postes. À l'inverse, le second document présente cette pratique comme une opportunité de responsabilisation et d'indépendance financière, que ce soit par choix personnel ou par nécessité économique.

À mon avis, le travail d'été est une expérience formatrice indéniable, bien qu'elle exige un équilibre fragile. S'il est vrai que la fatigue accumulée peut peser sur la rentrée, l'acquisition de compétences professionnelles et la valeur de l'argent gagné sont des atouts majeurs pour l'avenir. Toutefois, il est primordial que l'étudiant conserve quelques semaines de répit pour éviter l'épuisement avant la reprise des cours.

En conclusion, le job d'été est un compromis nécessaire entre autonomie et bien-être. Bien encadré, il demeure un levier d'épanouissement social et financier incontestable.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 21,
    taches: [
      {
        numero: 1,
        consigne: "Vous voulez partir en week-end avec vos amis le mois prochain. Vous leur écrivez un message pour décrire votre projet (lieu, transport, activités, etc.).",
        corrige: `Salut les amis !

Que diriez-vous de partir en week-end à Kribi le mois prochain pour profiter de la plage ? Mon projet est simple : nous pourrions louer un grand bungalow au bord de l'eau. Pour le transport, le plus pratique serait de prendre ma voiture et celle de Marc pour diviser les frais de carburant. Au programme : détente sur le sable, visite des chutes de la Lobé et dégustation de crevettes grillées en soirée.

J'ai hâte de partager ces moments de convivialité avec vous. Dites-moi si ces dates vous conviennent pour que je puisse réserver un logement rapidement !

À très vite !
Anne`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Sur un forum de courrier des lecteurs, on pose la question : « Tout quitter pour partir en voyage pendant un an : bonne ou mauvaise idée ? ». Vous écrivez un message sur ce site pour répondre à la question posée en prenant des exemples de votre vie personnelle.",
        corrige: `Partir pour mieux se retrouver !

Coucou tout le monde,

Selon moi, tout quitter pour voyager durant un an est la plus belle décision que l'on puisse prendre. J'ai moi-même tenté l'aventure il y a deux ans, après avoir démissionné de mon poste de bureau pour parcourir l'Asie du Sud-Est. Au début, j'éprouvais une certaine peur face à l'inconnu, mais ce sentiment s'est vite transformé en une liberté absolue. J'ai adoré découvrir de nouvelles cultures et apprendre à gérer l'imprévu au quotidien. Ce voyage m'a permis de mieux me connaître et de redéfinir mes priorités professionnelles. Certes, le retour a été un peu difficile, car il a fallu se réadapter à une routine, mais les souvenirs et la confiance acquis sont impérissables.

C'est une expérience transformatrice que je recommande à quiconque en ressent l'appel. Ce n'est pas une fuite, mais un investissement sur soi-même !

Rachel`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Le travail devrait être synonyme de réussite et de satisfaction, mais il est trop souvent synonyme de fatigue et d'épuisement. Nous passons plus de temps au bureau qu'avec notre famille ou nos amis. Il est urgent de revoir la place occupée par le travail dans notre vie et d'accorder plus de temps libre pour mieux vivre.",
        document2: "Selon Daniel Rémond, la vie en entreprise est très formatrice. Le travail est un lieu de socialisation essentiel où l'on rencontre des personnes différentes et où l'on vit aussi des difficultés. Tout cela contribue à construire notre personnalité et notre identité. Le travail est un pilier fondamental de notre existence.",
        titre_corrige: "Le travail : socle de l'identité ou frein au bonheur ?",
        corrige: `La place du travail dans nos vies modernes soulève des interrogations fondamentales. Le premier document dénonce l'omniprésence d'une activité professionnelle souvent perçue comme aliénante et épuisante. Il appelle à une réduction du temps de travail pour privilégier la vie privée et les loisirs. À l'opposé, le second document défend l'idée que le travail est constitutif de notre identité. Selon cette vision, l'entreprise est un lieu essentiel de socialisation qui forge la personnalité de l'individu.

À mon avis, le travail ne doit être ni une prison, ni l'unique définition de soi. S'il est indéniable qu'une carrière réussie procure un sentiment de fierté et facilite les interactions sociales, elle ne doit pas sacrifier l'équilibre familial. Je pense qu'une vie épanouie repose sur une harmonie entre engagement professionnel et temps pour soi.

En conclusion, si le travail demeure un pilier de notre existence, il doit rester un outil au service de l'homme et non l'inverse.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 22,
    taches: [
      {
        numero: 1,
        consigne: "Vous répondez à ce message sur le forum. Vous parlez de votre pays et de votre culture. Vous essayez de donner envie aux internautes de découvrir votre pays (60 mots minimum / 120 mots maximum).",
        corrige: `Salut à tous !

Si vous cherchez une destination authentique, venez découvrir le Cameroun, souvent surnommé « l'Afrique en miniature ». C'est un pays d'une richesse culturelle incroyable avec plus de 200 ethnies. Vous serez séduits par l'hospitalité légendaire des habitants et la diversité des paysages, entre les plages de sable fin de Kribi et les montagnes de l'Ouest. Côté gastronomie, ne repartez pas sans avoir goûté au célèbre Ndolé ou au poisson braisé, un pur délice ! Entre traditions ancestrales et dynamisme urbain, chaque ville vous réserve une surprise. Je vous garantis un dépaysement total et des souvenirs inoubliables.

Alors, quand est-ce que vous venez nous voir ?

À plus,
Marc`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez commencé un nouveau travail. Vous écrivez un courriel à vos amis pour leur parler de votre premier jour et décrire votre nouveau poste.",
        titre_corrige: "Ma première semaine au bureau !",
        corrige: `Salut les amis !

J'ai pris mon nouveau poste de responsable marketing lundi dernier et, pour être honnête, cette semaine a été aussi intense que passionnante. J'ai passé mes premiers jours en immersion totale pour comprendre les projets en cours. Ce que j'adore déjà, c'est l'ambiance collaborative : même si j'ai ressenti un peu d'appréhension face à l'ampleur des tâches, l'équipe a rapidement dissipé mes doutes. J'ai même déjà piloté ma première réunion stratégique jeudi !

Ce poste dépasse mes attentes et je me sens vraiment à ma place. Si vous cherchez un nouveau défi, je vous recommande de privilégier la culture d'entreprise lors de vos entretiens : c'est la clé de l'épanouissement !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Les hommes et les femmes ont les mêmes droits et les mêmes obligations. Les femmes peuvent exercer le métier ou la profession de leur choix. Elles sont présentes aux postes de décision ; elles sont par exemple députées, mairesses, conseillères, administratrices ou dirigeantes de grandes entreprises, des postes traditionnellement réservés aux hommes.",
        document2: "Un étudiant est le seul étudiant masculin de sa classe de formation de sage-femme. Diplômé, il sera le tout premier homme sage-femme. Il a su que ce métier était fait pour lui. Aider les femmes à mettre leur bébé au monde est sa vocation. Sa présence dans le programme de formation est la bienvenue, mais sa présence peut encore surprendre les patientes.",
        titre_corrige: "L'égalité professionnelle : au-delà des barrières traditionnelles",
        corrige: `La mixité dans le monde du travail est un pilier des sociétés modernes. Le premier document souligne que les femmes ont désormais accès à des postes de haute responsabilité et à des carrières autrefois masculines. Le second illustre ce phénomène à l'envers : un homme intègre une formation de sage-femme, un métier historiquement féminin. Bien que sa présence puisse surprendre, elle marque une avancée vers une liberté de choix professionnelle totale.

À mon avis, la compétence doit primer sur le genre, quel que soit le domaine d'activité. S'il est encourageant de voir des femmes diriger des entreprises, il est tout aussi essentiel de normaliser la présence des hommes dans les secteurs du soin ou de la petite enfance. Je pense que briser ces stéréotypes enrichit les professions grâce à des perspectives nouvelles. Toutefois, le changement des mentalités chez les patients ou les clients reste un défi à relever.

En conclusion, l'égalité réelle sera atteinte lorsque le choix d'un métier ne dépendra plus du sexe, mais uniquement de la passion et des aptitudes individuelles.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 23,
    taches: [
      {
        numero: 1,
        consigne: "Vous allez bientôt vous installer dans la ville d'un ami francophone. Envoyez-lui un courriel pour lui demander de l'aide pour la recherche d'un logement, en lui fournissant toutes les informations nécessaires (type de logement, budget, date).",
        corrige: `Objet : Petit coup de main pour ma recherche de logement ?

Salut Thomas !

J'ai une grande nouvelle : je vais bientôt m'installer dans ta ville pour mon prochain séjour. Je recherche idéalement un studio meublé ou une petite chambre en colocation, de préférence proche du centre-ville. Mon budget maximum est de 600 euros par mois, charges comprises. J'aimerais pouvoir emménager dès le 1er septembre prochain.

Connais-tu des sites locaux fiables ou aurais-tu entendu parler d'une opportunité ? Merci d'avance pour ton aide précieuse, on se voit très vite !

Amicalement,
Job`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Votre école vous a chargé d'organiser une journée spéciale pour accueillir les nouveaux étudiants francophones. Vous rédigez un courriel destiné à ces étudiants dans lequel vous donnez tous les détails pour le bon déroulement de cette journée.",
        corrige: `Objet : Retour sur l'organisation de votre journée d'accueil

Chers étudiants,

L'école m'a confié la mission d'organiser votre journée d'intégration qui s'est déroulée samedi dernier. Tout avait été planifié pour vous offrir un accueil chaleureux et faciliter votre arrivée. Dès huit heures, nous vous avons accueillis dans le grand hall avec un petit-déjeuner. Nous avons ensuite pris soin de vous présenter les laboratoires et la bibliothèque. À midi, nous avons partagé un buffet traditionnel afin de vous faire découvrir la gastronomie locale. L'après-midi a été consacré à des activités sportives et des jeux de rôle pour briser la glace.

J'ai été ravi de constater que vous avez tous participé avec enthousiasme, ce qui a rendu cette journée mémorable. J'espère que ces premiers moments ont dissipé vos appréhensions et je vous souhaite une excellente réussite dans vos études !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "À mon avis, le fait de vivre en ville vous donne la possibilité de vous divertir de plusieurs manières : aller au cinéma, déjeuner dans un restaurant, faire du sport dans une salle équipée... Il suffit de marcher un peu ou de prendre un taxi si le trajet est plus long. En ville, tout est à disposition !",
        document2: "La campagne offre une disponibilité des logements avec des prix largement inférieurs à ceux proposés en ville. Avec ce budget, on peut espérer avoir un grand jardin et un espace de vie confortable, ce qu'on ne peut pas se permettre en milieu urbain.",
        titre_corrige: "Ville ou campagne : quel cadre pour une vie épanouie ?",
        corrige: `Le choix du lieu de résidence oppose souvent deux visions du quotidien. Le premier document vante les mérites de la ville, soulignant la proximité immédiate des services, des commerces et la richesse de l'offre culturelle. À l'inverse, le second témoignage valorise l'exode vers la campagne, motivé par un besoin de calme, un lien retrouvé avec la nature et un pouvoir d'achat immobilier nettement supérieur. L'espace et le jardin y remplacent les sorties citadines par une convivialité plus intime.

À mon avis, le cadre de vie idéal dépend de nos priorités personnelles et de notre étape de vie. S'il est vrai que l'effervescence urbaine est stimulante pour la vie sociale et professionnelle, je pense que la qualité de vie offerte par la campagne est incomparable pour se ressourcer. Toutefois, vivre loin des centres urbains demande une certaine logistique pour les déplacements.

En conclusion, que l'on privilégie la culture ou la nature, chaque environnement offre des opportunités uniques de s'épanouir.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 24,
    taches: [
      {
        numero: 1,
        consigne: "Vous habitez dans un grand appartement et vous recherchez un colocataire. Décrivez le type de colocation que vous proposez ainsi que les caractéristiques de votre appartement.",
        corrige: `Objet : Recherche colocataire pour grand appartement lumineux

Salut à tous !

Je propose une colocation dans mon appartement de 100 m² situé près du centre-ville, avec un balcon et une vue dégagée. La chambre disponible est spacieuse, meublée et très calme. Je recherche une personne sérieuse, propre et de préférence non-fumeuse. L'idée est de partager un lieu de vie agréable où chacun respecte l'intimité de l'autre, tout en partageant un repas de temps en temps. Le loyer est de 500 euros, charges comprises.

Si vous êtes intéressé, contactez-moi pour organiser une visite !

À bientôt !
Gaspard`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Une troupe de théâtre s'est installée dans votre ville, et vous avez assisté à l'un de ses spectacles. Rédigez un article de blog pour décrire cette expérience.",
        titre_corrige: "Une soirée magique sous les projecteurs",
        corrige: `Chers Lecteurs,

La semaine dernière, j'ai eu le privilège d'assister à une représentation de la troupe « Les Tréteaux du Monde », qui a posé ses valises dans notre centre culturel pour un mois. La pièce, un mélange de tragédie classique et de mise en scène moderne, était tout simplement époustouflante. L'énergie des comédiens était si communicative que le public semblait suspendu à leurs lèvres. Les décors minimalistes, sublimés par des jeux de lumières ingénieux, créaient une intimité rare avec la scène.

Malgré la longueur de certaines scènes, je suis ressorti de là avec une immense envie de soutenir l'art vivant. Si vous aimez les émotions fortes, je vous encourage vivement à réserver vos places avant leur départ !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Une étude a révélé que les enfants sont constamment exposés à de nombreuses publicités, que ce soit à la télévision, dans les magazines ou sur Internet. Ils sont particulièrement ciblés par des publicités pour des produits alimentaires peu sains, des jouets, des jeux vidéo et autres produits, ce qui peut influencer leurs choix de consommation et leurs demandes envers leurs parents.",
        document2: "Un article de recherche publié dans une revue scientifique souligne que les enfants ont des capacités cognitives limitées pour comprendre et interpréter les messages publicitaires. L'éducation parentale et l'environnement culturel ont un rôle plus important dans les choix de consommation des enfants que la publicité elle-même.",
        titre_corrige: "La publicité face aux enfants : manipulation ou influence secondaire ?",
        corrige: `L'exposition des jeunes aux messages publicitaires soulève un débat éthique majeur. Le premier document souligne que les enfants sont la cible constante de campagnes agressives pour des produits souvent peu sains, influençant directement leurs désirs de consommation. À l'inverse, le second document, tout en reconnaissant la vulnérabilité cognitive des plus jeunes, nuance ce constat. Il affirme que l'éducation parentale et l'environnement social demeurent des remparts bien plus déterminants que la publicité pour orienter les choix des enfants.

À mon avis, si la publicité possède un pouvoir de persuasion indéniable, elle ne doit pas devenir le seul bouc émissaire. Je pense qu'il est primordial de renforcer l'esprit critique des enfants dès le plus jeune âge. Selon moi, une régulation plus stricte des contenus est nécessaire, mais elle doit impérativement s'accompagner d'un dialogue familial constant sur la consommation responsable.

En conclusion, la vigilance parentale reste le meilleur filtre pour protéger l'enfance des dérives du marketing.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 25,
    taches: [
      {
        numero: 1,
        consigne: "Votre ami Bernard va bientôt vivre dans votre quartier. Il cherche un endroit sympathique pour faire ses courses. Vous lui répondez et vous décrivez un marché de votre quartier que vous aimez bien (lieu, horaires, produits, etc.).",
        corrige: `Salut Bernard !

C'est une excellente nouvelle, bienvenue dans le quartier ! Pour tes courses, je te recommande vivement le « Marché du Soleil » situé sur la place de la mairie, à seulement dix minutes à pied de chez toi. Il a lieu tous les mercredis et samedis matin, de 7h à 13h. C'est un endroit très chaleureux où tu trouveras des produits locaux d'une fraîcheur incroyable : des fruits de saison, des légumes bio et même un excellent fromager. J'y vais souvent pour acheter leur pain artisanal, il est délicieux !

On pourrait s'y retrouver samedi prochain pour faire le tour des étals ensemble ?

À très bientôt,
Marshal`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez rejoint l'association « Graines d'Avenir » pour accompagner les jeunes de votre secteur. Sur votre site internet, vous racontez votre expérience et vous essayez de convaincre d'autres personnes de rejoindre l'association.",
        corrige: `L'année dernière, j'ai rejoint l'association « Graines d'Avenir » pour accompagner les jeunes de notre secteur. Mon expérience a débuté par des séances d'aide aux devoirs chaque mardi soir. J'ai été immédiatement frappé par la motivation de ces enfants qui cherchaient simplement un cadre calme et bienveillant pour progresser. Au fil des mois, nous avons aussi organisé des sorties culturelles et des tournois de football.

Ces moments de partage ont permis de renforcer la cohésion entre les familles et de lutter contre l'isolement de certains jeunes. J'ai vu des enfants timides gagner en confiance et créer des liens précieux. Cette aventure a enrichi ma vie autant que celle des jeunes que j'accompagne.

Je recommande vivement cette expérience humaine : donner un peu de son temps pour transmettre des savoirs est la plus gratifiante des aventures !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Depuis plusieurs années, de nombreux lecteurs ont décidé de passer au livre numérique. Les livres numériques ont un autre avantage : ils permettent une ouverture sur le monde pour les personnes en situation de handicap. Certaines options, comme le réglage de la taille des lettres, facilitent la lecture pour les personnes malvoyantes.",
        document2: "Le livre numérique remplacera-t-il le livre papier ? « Non », répondront la plupart des lecteurs. Le livre papier est un beau support. Quel plaisir de le prêter aux amis ! Les livres numériques ont un côté un peu impersonnel. De plus, ils demandent de posséder un minimum de connaissances en informatique, ce qui peut être une difficulté pour certaines personnes.",
        titre_corrige: "Le livre à l'ère du numérique : révolution ou déshumanisation ?",
        corrige: `L'évolution des supports de lecture divise les passionnés de littérature. Le premier document met en avant les atouts pragmatiques du livre numérique, soulignant son caractère économique, écologique et inclusif. Grâce à des options d'accessibilité, il offre une autonomie précieuse aux lecteurs en situation de handicap. À l'opposé, le second document défend la pérennité du format papier, perçu comme un objet chargé d'émotions. Le plaisir tactile, l'odeur du papier et la facilité de partage en font un support irremplaçable face à la froideur technologique des liseuses.

À mon avis, ces deux supports ne sont pas mutuellement exclusifs mais complémentaires. S'il est indéniable que le numérique facilite l'accès à la culture lors des déplacements, je pense que le livre physique reste essentiel pour la mémorisation et le plaisir esthétique. Selon moi, l'essentiel est de préserver l'habitude de lire, peu importe l'écran ou la page.

En conclusion, si le numérique gagne du terrain par sa praticité, le livre papier demeure le garant d'une expérience sensorielle et d'un lien social authentique.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 26,
    taches: [
      {
        numero: 1,
        consigne: "Votre ami Mathieu vous écrit pour vous demander de lui conseiller une visite à faire pendant son voyage dans votre région. Vous lui répondez et vous décrivez un lieu à visiter.",
        corrige: `Salut Mathieu !

Quelle excellente idée de venir nous voir ! Si tu ne dois faire qu'une seule visite, je te conseille vivement de monter au Mont Fébé. C'est un endroit très paisible et l'air y est plus frais qu'en centre-ville. Tu y trouveras aussi un magnifique terrain de golf et un monastère avec un petit musée d'art camerounais fascinant.

Je te suggère d'y aller en fin d'après-midi pour profiter du coucher de soleil sur les collines, c'est vraiment magique ! Préviens-moi dès que tu arrives, on pourrait y aller ensemble.

À très bientôt,
Maxime`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez pris des cours dans une salle de sport. Sur le site internet de la salle, vous donnez votre avis sur cette expérience.",
        titre_corrige: "Mon expérience à la salle : un vrai déclic !",
        corrige: `L'année dernière, j'ai décidé de m'inscrire à « Ma Salle de Sport » pour reprendre une activité physique régulière. Dès ma première séance, j'ai été accueilli par une équipe dynamique qui m'a immédiatement mis à l'aise. Pendant six mois, j'ai suivi des cours de cardio et de musculation deux fois par semaine. L'ambiance était toujours motivante et les locaux étaient impeccablement entretenus.

Ce que j'appréciais particulièrement, c'était l'accompagnement des coachs : ils étaient toujours disponibles pour corriger mes mouvements et m'encourager quand la fatigue se faisait sentir. J'ai vu mes capacités physiques progresser rapidement, ce qui a grandement amélioré mon bien-être quotidien.

Je recommande vivement cet établissement à tous ceux qui souhaitent se remettre en forme. L'encadrement professionnel et la convivialité des membres font de chaque séance un moment de plaisir plutôt qu'une corvée !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "La livraison de repas permet de gagner du temps. Par exemple, quand on travaille, on peut se faire livrer un repas au bureau sans se déplacer. On perd moins de temps pendant la pause déjeuner, on rentre donc plus tôt chez soi. Généralement, cela offre plus de choix et est disponible à toute heure.",
        document2: "Les repas sont souvent livrés en scooter ou en voiture, qui sont des modes de transport polluants. Cette habitude a aussi des conséquences négatives sur la vie sociale. Quand on mange des repas livrés au bureau ou à domicile, on a tendance à rester enfermé et à voir les mêmes personnes. Pourtant, il est important de sortir pour entretenir ses relations sociales.",
        titre_corrige: "La livraison de repas : entre confort moderne et isolement",
        corrige: `L'essor de la livraison de repas à domicile transforme nos habitudes de consommation. Le premier document met en avant ses avantages pratiques, permettant de diversifier les menus tout en restant productif au travail. À l'inverse, le second texte pointe du doigt les dérives de ce modèle : une empreinte carbone élevée due aux modes de transport polluants et un risque d'appauvrissement des liens sociaux, favorisant l'enfermement au détriment des interactions en extérieur.

À mon avis, bien que la livraison soit d'une aide précieuse lors de journées chargées, elle ne doit pas devenir un automatisme. Je pense que le plaisir de cuisiner ou de sortir déjeuner au restaurant reste essentiel pour maintenir un équilibre de vie sain. Selon moi, il est primordial de privilégier des plateformes utilisant des vélos pour limiter l'impact écologique.

En conclusion, la livraison doit rester une solution de commodité occasionnelle plutôt qu'un mode de vie permanent.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 27,
    taches: [
      {
        numero: 1,
        consigne: "Votre amie Barbara vous demande de lui suggérer un endroit pour déjeuner en plein air ce week-end. Vous lui répondez en décrivant le lieu (parc, jardin, terrasse, etc.).",
        corrige: `Salut Barbara !

Quelle bonne idée ! Pour déjeuner en plein air ce week-end, je te suggère sans hésiter le Parc de la Sablière. C'est un endroit idéal pour un pique-nique. On y trouve des tables en bois aménagées au bord de l'eau, ce qui rend le cadre vraiment paisible. Si tu préfères ne pas cuisiner, il y a aussi une petite terrasse qui sert des grillades et des jus de fruits frais juste à l'entrée.

C'est l'endroit idéal pour profiter du soleil tout en étant au calme. On s'y retrouve dimanche vers midi ?

Bises,
Sarah`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez visité un nouveau pays pendant vos vacances. Sur un site internet, racontez votre expérience et donnez votre opinion sur ce pays.",
        titre_corrige: "Une aventure inoubliable au pays du sourire",
        corrige: `L'été dernier, j'ai eu la chance de découvrir le Vietnam pour la première fois. Mon voyage a commencé par l'agitation fascinante de Hanoï, où j'ai été immédiatement séduit par l'énergie des rues et la gentillesse des habitants. Pendant deux semaines, j'ai parcouru le pays du nord au sud. Je me souviens particulièrement de notre croisière dans la baie d'Ha Long ; les paysages étaient tout simplement grandioses sous la brume matinale.

À l'époque, je ne connaissais que très peu la gastronomie locale, mais j'ai adoré goûter des plats authentiques sur les marchés flottants. Ce pays m'a marqué par son incroyable contraste entre traditions millénaires et modernité galopante.

C'est une expérience qui transforme notre regard sur le monde et j'ai hâte d'y retourner !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Dans de nombreux secteurs, notamment les secteurs médical et alimentaire, le plastique est vital pour la conservation des aliments et la stérilisation des équipements médicaux. Franck prône une utilisation responsable et le recyclage, mais reconnaît que certains usages du plastique sont indispensables pour la société moderne.",
        document2: "Amicha dénonce l'impact environnemental dévastateur du plastique. Elle soutient que les déchets plastiques polluent les océans et les écosystèmes, causant des dommages irréparables. Amicha milite pour des alternatives durables afin de préserver notre santé et la biodiversité.",
        titre_corrige: "Le plastique : un outil indispensable ou un fléau environnemental ?",
        corrige: `Le débat sur l'usage du plastique oppose deux visions de la modernité. Le premier document défend une approche pragmatique, rappelant que ce matériau reste vital dans des secteurs critiques comme la santé, pour la stérilisation, ou l'alimentaire, pour la conservation. Franck y prône une gestion responsable par le recyclage. À l'opposé, le second document exprime une opposition radicale. Amicha y dénonce un impact écologique dévastateur, notamment sur les océans, et appelle à une transition urgente vers des alternatives durables pour préserver notre santé et la biodiversité.

À mon avis, bien que le plastique soit difficilement remplaçable dans la médecine de pointe, notre dépendance aux emballages jetables est devenue insoutenable. Je pense qu'il est primordial de distinguer les usages « vitaux » des usages « de confort ». S'il est vrai que le recyclage est une piste, il ne suffit plus face à l'ampleur de la pollution actuelle.

En conclusion, la protection de l'environnement impose de sacrifier le côté pratique du plastique au profit de solutions plus éthiques.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 28,
    taches: [
      {
        numero: 1,
        consigne: "Le journal « Bienvenue » compte publier un article qui parle des habitants de la ville. Écrivez un message qui sera diffusé dans ce numéro. Vous êtes récemment installé dans cette ville, et il vous est demandé de vous présenter et de décrire tous vos lieux préférés au sein de cette ville.",
        corrige: `Bonjour à tous !

Je m'appelle Marc et je me suis installé à Yaoundé il y a tout juste trois mois pour des raisons professionnelles. J'ai été immédiatement séduit par l'accueil chaleureux des citadins. Mon lieu favori est sans doute le Mont Fébé, où j'aime me promener le week-end pour admirer la vue imprenable sur les collines. J'apprécie également beaucoup le Musée National pour son architecture et son histoire fascinante. Enfin, pour mes sorties, je recommande la terrasse du Bois Sainte-Anastasie, un endroit convivial où l'ambiance est toujours chaleureuse.

Ravi de faire désormais partie de votre communauté !

À bientôt dans nos rues,
Marc`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez assisté au concert de votre artiste préféré. Sur votre page personnelle, vous partagez cette expérience et vous incitez vos amis et les autres à assister à son prochain concert.",
        titre_corrige: "Une soirée inoubliable avec Locko !",
        corrige: `Hier soir, j'ai enfin réalisé un rêve : assister au concert de Locko au Palais des Sports. Dès notre arrivée, l'ambiance était électrique, le public reprenait ses plus grands succès avant même son entrée en scène. Lorsqu'il a commencé à chanter, le temps s'est arrêté. Sa voix était encore plus impressionnante en direct qu'en studio, et son énergie communicative a instantanément conquis la salle entière.

J'ai été particulièrement touché par sa complicité avec ses musiciens et ses fans. Pendant deux heures, il a enchaîné les titres avec une passion incroyable, transformant ce concert en un moment de partage pur. C'était une expérience magique et pleine d'émotions que je n'oublierai jamais.

Si vous aimez sa musique, je vous encourage vivement à prendre vos places pour sa prochaine tournée. Croyez-moi, vous ne le regretterez pas !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Les enfants qui jouent aux jeux vidéo peuvent développer des pensées négatives et des comportements agressifs. Une étude récente, menée sur des enfants âgés de 9 à 18 ans jouant fréquemment aux jeux vidéo, a révélé que le fait de jouer à des jeux de violence augmente considérablement un comportement agressif. Selon Diego Gentil, ce phénomène est inévitable quel que soit le degré de vigilance des parents.",
        document2: "On parle tout le temps des effets négatifs des jeux vidéo, mais ces derniers peuvent également avoir quelques avantages pour le fonctionnement du cerveau et pour la santé. Les jeux stimulent des fonctions cognitives essentielles telles que la capacité d'analyse, la concentration et la créativité, offrant ainsi un véritable entraînement pour le cerveau.",
        titre_corrige: "Jeux vidéo : entre dérive agressive et stimulation mentale",
        corrige: `L'impact des jeux vidéo sur la jeunesse suscite des avis divergents. Le premier document s'alarme d'un lien direct entre la pratique régulière de jeux violents et le développement de comportements agressifs, affirmant que ce phénomène échappe même au contrôle parental. À l'opposé, le second document souligne les vertus thérapeutiques et intellectuelles de ce média. Selon cet article, le jeu stimulerait des fonctions cognitives essentielles, telles que la capacité d'analyse, la concentration et la créativité.

À mon avis, le problème ne réside pas dans l'outil, mais dans l'usage et le contenu choisi. Je pense qu'il est réducteur de condamner l'ensemble du secteur, car de nombreux jeux éducatifs favorisent l'éveil intellectuel. S'il est vrai qu'une exposition prolongée à la violence peut désensibiliser les plus jeunes, une sélection rigoureuse des titres et un encadrement temporel suffisent à transformer cette activité en un loisir enrichissant.

En conclusion, la modération et le discernement sont les clés pour profiter des bienfaits cognitifs des jeux vidéo tout en évitant les risques comportementaux.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 29,
    taches: [
      {
        numero: 1,
        consigne: "Une organisation souhaite aider les personnes qui souhaitent apprendre le français à trouver des partenaires d'échange linguistique. Envoyez un courriel pour répondre à cette annonce en vous présentant et en expliquant pourquoi vous voulez pratiquer cette langue.",
        corrige: `Objet : Candidature pour le programme d'échange linguistique

Bonjour,

Je m'appelle Marc, je suis responsable marketing et je réside actuellement à Yaoundé. Ayant découvert votre annonce, je suis vivement intéressé par votre proposition d'accompagnement linguistique. Bien que je possède déjà des bases, je souhaite pratiquer le français de manière plus régulière pour fluidifier mes échanges professionnels et élargir mon réseau social. Mon objectif est d'améliorer ma prononciation et de maîtriser les expressions idiomatiques courantes.

Je suis convaincu qu'échanger avec des partenaires natifs est la méthode la plus efficace pour progresser rapidement. Je serais ravi de participer à ces rencontres et de partager en retour ma propre culture.

Dans l'attente de votre réponse, je vous remercie pour cette belle initiative.

Cordialement,
Marc`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez été invité(e) à une fête en famille. Vous envoyez un message à vos amis pour raconter cette fête et expliquer ce que vous avez le plus aimé.",
        corrige: `Un dimanche inoubliable en famille

Le week-end dernier, j'ai été invité à une grande fête organisée pour l'anniversaire de ma tante. Toute la famille s'était réunie dans une magnifique maison à la sortie de la ville. Dès mon arrivée, j'ai été plongé dans une ambiance festive et colorée où les rires résonnaient partout.

Ce que j'ai le plus aimé, c'est ce moment unique où nous nous sommes tous retrouvés autour d'un immense buffet traditionnel. On y trouvait tous mes plats préférés, préparés avec amour par mes cousins. L'atmosphère était empreinte de nostalgie et de joie ; nous avons passé l'après-midi à nous raconter des souvenirs d'enfance et à danser sur nos musiques favorites.

Cette expérience m'a rappelé combien ces liens sont précieux pour se ressourcer. Ne manquez jamais ces occasions : elles permettent de renforcer la cohésion familiale !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "Avec des taux de pollution alarmants constatés dans plusieurs villes, la capitale de la Norvège, Oslo, a récemment opté pour l'interdiction des voitures dans son centre-ville. Cette mesure a permis de réduire significativement la pollution de l'air, les accidents de la route et la dépendance aux énergies fossiles.",
        document2: "Il n'est pas raisonnable de supprimer les voitures d'une zone urbaine sans mettre en place les outils et les infrastructures nécessaires. En diminuant les voitures, on pollue moins, mais en contrepartie il faut prévoir de gigantesques parkings pour garer les voitures, développer davantage le transport en commun (métros et bus) et prévoir des autorisations de circulation pour certains corps de métier (police, urgentistes, livreurs, etc.).",
        titre_corrige: "L'interdiction des voitures en ville : entre ambition et réalité",
        corrige: `Le débat sur la piétonnisation des centres-villes oppose une volonté environnementale à des défis structurels. Le premier document présente l'exemple d'Oslo comme un succès, affirmant que l'interdiction des voitures réduit la pollution, les accidents et la dépendance aux hydrocarbures. À l'inverse, le second texte nuance cette réussite. S'il reconnaît les bénéfices pour la santé et le cadre de vie, il souligne l'impératif de développer des infrastructures alternatives, telles que des parkings périphériques et des transports en commun performants, pour ne pas paralyser la vie urbaine.

À mon avis, bannir les véhicules est une nécessité écologique, mais elle doit être progressive. Je pense qu'une ville sans voitures ne peut fonctionner que si l'offre de bus ou de métros est irréprochable. Selon moi, il est également crucial de préserver la mobilité des services d'urgence et des commerçants pour maintenir le dynamisme économique.

En conclusion, la transition vers des zones urbaines sans voitures est un projet noble qui exige une planification rigoureuse pour concilier écologie et accessibilité.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 30,
    taches: [
      {
        numero: 1,
        consigne: "Vous souhaitez inviter vos amis à découvrir un lieu touristique que vous appréciez. Vous leur proposez une date, une heure et un hébergement pour cette visite.",
        corrige: `Salut tout le monde !

J'aimerais beaucoup vous emmener découvrir les Chutes de la Lobé à Kribi. C'est un endroit unique au monde que j'adore, car le fleuve se jette directement dans l'océan, créant un paysage à couper le souffle. On peut y déguster des crevettes fraîches sur la plage, les pieds dans le sable, dans une atmosphère très relaxante.

Je vous propose d'y aller le week-end du 15 mai. On pourrait se rejoindre là-bas à 10h00. Pour l'hébergement, j'ai repéré un petit hôtel écologique très sympa en bord de mer.

Dites-moi vite si ça vous tente pour que je puisse réserver !

Bises,
Carla`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez assisté à un festival gastronomique et vous avez été déçu. Rédigez un article sur votre blog dans lequel vous expliquez ce qui ne vous a pas plu.",
        titre_corrige: "Festival Saveurs du Monde : une recette qui a tourné au vinaigre !",
        corrige: `Samedi dernier, je me suis rendu avec impatience au festival « Saveurs du Monde » organisé sur la place centrale de Yaoundé. Passionné de gastronomie, je m'attendais à découvrir des spécialités exotiques et à passer un moment convivial en plein air. Malheureusement, l'expérience a rapidement tourné à la catastrophe. À mon arrivée, j'ai constaté avec amertume que l'organisation était totalement dépassée par l'affluence. Les files d'attente s'étiraient sur des dizaines de mètres et le personnel semblait complètement désorganisé.

Ce qui m'a le plus déçu, c'est que la plupart des stands étaient déjà en rupture de stock dès 13h. De plus, les prix étaient excessivement élevés pour des portions minuscules servies dans des assiettes en plastique de mauvaise qualité.

Je vous suggère d'attendre les retours des prochaines éditions avant de vous y aventurer, car un bon festival doit savoir conjuguer qualité et organisation.`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "À mon avis, vivre en ville offre de nombreuses possibilités de divertissement. Tout est à proximité, ce qui évite de parcourir de longues distances pour se distraire. Il suffit de marcher un peu ou de prendre un taxi si le trajet est plus long. En ville, tout est à disposition !",
        document2: "La campagne m'a offert une disponibilité des logements avec des prix largement inférieurs à ceux proposés en ville. Cet élément important a motivé ma décision. Je n'aurais pas pu espérer réaliser ce projet de si tôt si j'étais resté en ville.",
        titre_corrige: "Ville ou campagne : où se cache le véritable bien-être ?",
        corrige: `Le débat entre urbanité et ruralité oppose deux modes de vie distincts. Le premier document vante les mérites de la ville, soulignant la proximité des services, la richesse culturelle et la diversité des divertissements accessibles sans effort. À l'inverse, le second témoignage valorise l'exode rural, mettant en avant la quête de sérénité, le contact avec la nature et un pouvoir d'achat immobilier nettement supérieur permettant de profiter d'un espace privé confortable.

À mon avis, bien que la ville soit stimulante, la qualité de vie offerte par la campagne est aujourd'hui inégalable pour l'équilibre personnel. Je pense que le calme et l'espace sont devenus des luxes essentiels face au stress urbain. Par exemple, disposer d'un jardin permet de cultiver ses propres produits ou de recevoir ses proches dans un cadre apaisant, ce qui favorise une vie sociale plus authentique. Selon moi, la réduction du coût du logement à la campagne est un argument décisif qui permet de vivre mieux avec un budget maîtrisé.

En conclusion, chaque environnement a ses atouts : l'essentiel est de choisir celui qui correspond à ses valeurs profondes.`,
        mots_indicatif: 180,
      },
    ],
  },
  {
    id: 31,
    taches: [
      {
        numero: 1,
        consigne: "Vous souhaitez fêter votre anniversaire dans un restaurant. Vous invitez vos amis. Vous leur écrivez un courriel pour leur donner toutes les informations nécessaires (lieu, date, horaires, menus, prix) et vous leur demandez une réponse (60 mots minimum / 120 mots maximum).",
        corrige: `Objet : Invitation – Mon anniversaire au restaurant !

Salut à tous !

Pour fêter mes 30 ans, je vous invite à dîner le samedi 23 mai au restaurant « Le Jardin des Saveurs » à partir de 19h30. Ils proposent un menu spécial à 25 euros comprenant une entrée, un plat au choix (viande ou poisson) et un dessert. C'est un endroit magnifique avec une terrasse ombragée que vous allez adorer !

Merci de me confirmer votre présence avant mercredi soir pour que je puisse finaliser la réservation. J'ai hâte de vous retrouver pour cette belle soirée !

À très bientôt,
Sophia`,
        mots_indicatif: 120,
      },
      {
        numero: 2,
        consigne: "Vous avez quitté la ville pour vous installer à la campagne. Sur un forum internet, vous expliquez pourquoi vous avez fait ce choix et vous présentez les avantages de votre nouvelle vie.",
        corrige: `Nouveau départ : ma vie au vert loin du chaos urbain !

Il y a tout juste six mois, j'ai décidé de quitter l'agitation permanente de Douala pour m'installer à la campagne. Épuisé par le rythme citadin, j'avais un besoin vital de calme et de reconnexion avec la nature. Le changement s'est opéré de manière radicale mais salvatrice. J'ai troqué les embouteillages interminables contre de longues marches matinales dans les plantations de café. À l'époque, je craignais l'isolement, mais j'ai rapidement découvert une solidarité villageoise exceptionnelle que je ne connaissais pas en ville.

Désormais, mes journées sont rythmées par le chant des oiseaux et l'air pur, ce qui a considérablement amélioré ma santé et ma créativité. Je dispose également d'un grand jardin où je cultive mes propres légumes bio.

Si vous vous sentez épuisés par la pollution, je vous recommande vivement de tenter l'expérience du télétravail à la campagne : c'est le secret d'un équilibre parfait !`,
        mots_indicatif: 150,
      },
      {
        numero: 3,
        consigne: "Rédigez un texte en vous appuyant sur les deux documents suivants.",
        document1: "La vidéosurveillance dans les écoles dissuade les actes de violence. Ce mode de surveillance est très bien accepté par les parents, les enseignants et la plupart des élèves. Si les parents sont rassurés concernant la sécurité de leurs enfants, les professeurs y voient une garantie de pouvoir exercer leur métier dans les meilleures conditions possibles.",
        document2: "Je suis contre la présence de caméras de surveillance dans nos écoles de Montréal. Dans les pays où ce système a été mis en place, les résultats ne sont pas très positifs. Comme les caméras sont très visibles, les personnes extérieures qui voudraient passer à l'acte peuvent facilement les contourner. Il vaudrait mieux renforcer le dialogue et appliquer strictement le règlement intérieur.",
        titre_corrige: "Vidéosurveillance à l'école : bouclier sécuritaire ou illusion d'optique ?",
        corrige: `La question de la sécurité scolaire à Montréal divise les opinions autour de l'usage des caméras. Le premier document soutient que la surveillance généralisée agit comme un moyen de dissuasion efficace contre la violence, rassurant ainsi les parents et garantissant un environnement de travail serein pour les enseignants. À l'opposé, le second texte critique l'inefficacité de ce système, soulignant que les caméras sont facilement contournées par les intrus. L'auteur prône plutôt le renforcement du dialogue humain et une application stricte du règlement intérieur pour résoudre les problèmes de discipline.

À mon avis, bien que la sécurité soit une priorité, transformer nos écoles en lieux de haute surveillance nuit au climat de confiance nécessaire à l'apprentissage. Je pense que la technologie ne peut remplacer la présence humaine et la médiation. Par exemple, une équipe de surveillants formés peut désamorcer un conflit avant qu'il n'éclate, ce qu'une caméra ne fera jamais. Selon moi, investir dans l'encadrement éducatif est plus pérenne que l'installation de dispositifs intrusifs qui menacent la vie privée des élèves.

En conclusion, la sécurité doit reposer sur la communication et la prévention humaine plutôt que sur une surveillance électronique constante et coûteuse.`,
        mots_indicatif: 180,
      },
    ],
  },
];
