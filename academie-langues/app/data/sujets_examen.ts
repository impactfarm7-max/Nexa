// app/data/sujets_examen.ts

// On met à jour le type pour accepter le format "Objet" sur la tâche 3
export type SujetTache3 = {
  consigne: string;
  titre: string;
  document1: string;
  document2: string;
  mots_min: number;
  mots_max: number;
};

export type ExamenType = {
  [key: number]: {
    1: string;
    2: string;
    3: SujetTache3;
  };
};

export const banqueSujetsExamen: ExamenType = {
  1: {
    1: "« Salut, Je suis vraiment intéressé à l'idée de voyager et de découvrir un autre pays. Peux-tu me parler un peu de ton pays et de sa culture ? Marc. »\n\nCONSIGNE : Écrivez un message à votre ami Marc pour lui parler de votre pays et de sa culture (lieux, sites touristiques, monuments, etc).",
    2: "Vous venez d'avoir un nouveau travail. Envoyez un courriel à vos amis pour leur raconter comment vous avez passé votre première semaine de travail (entreprise, poste, tâches, etc).",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "ÉGALITÉ HOMME/FEMME EN MILIEU DE TRAVAIL",
      document1: "Certains postes sont majoritairement occupés par des hommes. Au Québec, l'égalité entre les femmes et les hommes est respectée, les femmes peuvent faire les métiers réservés aux hommes tel que les postes de direction.",
      document2: "Malgré les efforts pour imposer la parité... il y a, dans les faits, des métiers où les femmes sont largement majoritaires tels que : les sages-femmes. De plus, les femmes ne doivent pas faire les métiers d'homme...",
      mots_min: 120,
      mots_max: 180
    }
  },
  2: {
    1: "Vous voulez partir en week-end avec vos amis le mois prochain. Vous leur écrivez un message pour décrire votre projet (lieu, transport, activités, etc.).",
    2: "COURRIER DES LECTEURS : « Tout quitter pour partir en voyage pendant un an: bonne ou mauvaise idée ? »\n\nCONSIGNE : Vous écrivez un message sur ce site internet, vous répondez à la question posée en prenant des exemples de votre vie personnelle.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LE TRAVAIL : FAVORABLE OU DÉFAVORABLE ?",
      document1: "Le travail est au centre de notre vie... Il devrait être synonyme de réussite et de satisfaction, mais il est trop souvent synonyme de fatigue et d'emprisonnement. Certains pensent que travailler moins permettrait d'avoir plus de temps libre pour mieux vivre.",
      document2: "Certaines personnes ont décidé d'arrêter de travailler pour changer de mode de vie. Pourtant, aujourd'hui, travailler, c'est exister... La vie en entreprise est très importante. Les contacts quotidiens, les réseaux, les amitiés... tout cela contribue à construire notre personnalité.",
      mots_min: 120,
      mots_max: 180
    }
  },
  3: {
    1: "Invitez vos amis à célébrer votre anniversaire tout en sollicitant leur soutien pour organiser la fête.",
    2: "Vous avez participé à un concours de cuisine, vous allez décrire vos souvenirs dans votre blog en indiquant les détails.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LE TRAVAIL DES ÉTUDIANTS PENDANT LES VACANCES",
      document1: "Je suis fermement pour le travail des jeunes pendant les vacances. C'est une excellente occasion d'acquérir des compétences pratiques... Les jeunes peuvent gagner de l'argent...",
      document2: "Je suis contre l'idée que les jeunes doivent travailler pendant leurs vacances. Les adolescents sont déjà sous une énorme pression... Les vacances doivent être une période pour eux de se détendre...",
      mots_min: 120,
      mots_max: 180
    }
  },
  4: {
    1: "« Je cherche un vélo en bon état et bon marché. Contactez-moi par courriel : mathieu@gmail.com »\n\nCONSIGNE : Vous avez un vélo à vendre. Vous écrivez un courriel pour décrire votre vélo et proposer un prix. Vous lui donnez un RDV pour essayer le vélo.",
    2: "Vous avez passé une journée à la campagne avec vos amis. À votre retour, vous écrivez un message sur votre forum pour raconter à vos amis comment cette journée s'est passée. Vous expliquez ce que vous avez aimé (activités, lieu, animaux, etc...).",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LA SÉVÉRITÉ DES PARENTS ENVERS LES ENFANTS",
      document1: "Je vais bientôt avoir 22 ans et j'habite toujours chez mes parents. Mon père et ma mère restent autoritaires avec moi... Ma mère ne cesse de m'appeler sur mon téléphone portable jusqu'à ce que je sois de retour.",
      document2: "Les parents craignent parfois d'être trop sévères avec leurs enfants... Même si les parents acceptent, par amour, tout ce dont leurs enfants demandent, cela pourrait avoir des effets négatifs lorsqu'ils passent à l'âge adulte.",
      mots_min: 120,
      mots_max: 180
    }
  },
  5: {
    1: "Vous voulez changer la décoration de votre appartement (meubles, peinture, objets, etc.). Vous écrivez un message à un(e) ami(e). Vous lui décrivez votre projet et vous lui demandez de vous aider.",
    2: "« Ecole De Musique ! Cours gratuits, concerts, Jeux. Rendez-Vous Vendredi, À partir de 9 Heures »\n\nCONSIGNE : Vous avez participé à cet évènement. Vous écrivez à vos amis pour raconter votre expérience et vous donnez votre opinion sur cette journée.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "FAUT-IL FAIRE SES COURSES DANS DES PETITS MAGASINS OU SUPERMARCHÉS ?",
      document1: "Le supermarché est très pratique ; on y trouve une grande variété de produits, tous à portée de main... De plus, les supermarchés offrent plusieurs marques pour un même produit.",
      document2: "ASSOCIATION POUR LA SAUVEGARDE DES PETITS COMMERCES. Le défi « Février sans supermarché » a été créé pour limiter la superpuissance des supermarchés... Le client aura tout à gagner : il bénéficiera de produits frais de meilleure qualité...",
      mots_min: 120,
      mots_max: 180
    }
  },
  6: {
    1: "Écrivez un courriel à vos amis pour les inviter à un anniversaire surprise de votre meilleur(e) ami(e). (Lieu, date, horaire, etc.).",
    2: "Vous avez participé à une brocante (achat / vente de produits d'occasion) dans votre ville. Sur votre blog personnel, racontez pourquoi vous avez aimé cette activité.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES VOLS À BAS PRIX",
      document1: "Je fais souvent mes voyages avec des compagnies aériennes à bas prix... Cela me coûte des fois moins chères que de voyager en voiture ou en train. Mais vous n'aurez le droit à aucun service à bord.",
      document2: "Récemment, j'ai pris la décision de ne plus voyager avec les compagnies aériennes à bas prix... Des sièges inconfortables, des conditions de travail pénibles et surtout des avions vétustes qui remettent en cause la sécurité !",
      mots_min: 120,
      mots_max: 180
    }
  },
  7: {
    1: "Écrivez un message pour inviter vos amis à une fête de fin d'année.",
    2: "Vous avez passé des vacances au Canada par le biais d'une agence de voyage. Écrivez un commentaire pour raconter votre expérience que vous avez vécue durant ce voyage.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LIMITATION DES VOITURES DANS LES CENTRES-VILLES",
      document1: "Avec des taux de pollution alarmants... plusieurs villes ont réussi leur pari d'interdire la circulation des voitures en zones urbaines. La capitale de Norvège, Oslo, a récemment opté pour cette solution...",
      document2: "Beaucoup de villes se lancent dans des projets d'interdiction de voitures... sans mettre en place les outils nécessaires. Il faut prévoir entre autres de gigantesques parkings pour garer les voitures et opter davantage pour le transport en commun.",
      mots_min: 120,
      mots_max: 180
    }
  },
  8: {
    1: "Écrivez un message à votre ami(e) qui souhaite suivre des cours de langue dans votre école. Donnez les détails spécifiques pour aider votre ami(e) à faire son choix. (lieu, tarifs, types de cours disponible, etc.).",
    2: "Vous travaillez dans une association qui aide les personnes âgées. Rédigez un article de blog pour raconter vos expériences et convaincre d'autres personnes de rejoindre l'association.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES ANIMAUX DE COMPAGNIE POUR LES ENFANTS",
      document1: "Offrir un animal de compagnie à un enfant présente de nombreux avantages... L'animal est un compagnon qui leur évitera la solitude. Grâce à lui, un enfant prendra confiance en lui.",
      document2: "Beaucoup d'enfants demandent, un jour ou l'autre, un animal à leurs parents... Mais avoir un animal coûte souvent très cher, et c'est une grande responsabilité. On ne peut pas le traiter comme un jouet.",
      mots_min: 120,
      mots_max: 180
    }
  },
  9: {
    1: "Un nouveau restaurant vient d'ouvrir près de chez vous. Vous écrivez à un(e) ami(e) pour lui proposer d'y aller avec vous. Vous décrivez le restaurant (cuisine, prix, décoration, etc.).",
    2: "Vous avez visité une ville que vous ne connaissiez pas. Vous avez envie de partager votre découverte. Vous postez un message sur un site Internet dédié aux voyages. Racontez votre expérience et expliquez ce qui vous a plu et ce qui vous a déplu dans la ville.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "VIE EN COLOCATION ENTRE ADULTES",
      document1: "Vivre avec d'autres personnes demande d'avoir une bonne entente et de respecter certaines règles... L'organisation et la discussion sont les clés d'une colocation réussie ou non.",
      document2: "Être adulte et vivre en colocation ? C'est un choix qui permet d'accéder facilement à un logement plus spacieux et économique... De plus, en partageant le loyer et les charges avec vos colocataires, vous réduirez considérablement vos dépenses.",
      mots_min: 120,
      mots_max: 180
    }
  },
  10: {
    1: "Vous venez d'arriver dans un nouveau pays. Vous écrivez à vos amis pour leur raconter votre arrivée et décrire vos premières impressions.",
    2: "Vous cherchez un(e) partenaire de sport. Vous publiez un message sur le site Internet des étudiants de votre école. Vous précisez vos disponibilités.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "RÔLE DE LA TÉLÉVISION DANS L'ÉDUCATION DES ENFANTS",
      document1: "La télévision est un outil de communication et de divertissement largement répandu... Elle joue un rôle important dans la transmission des connaissances et la sensibilisation aux enjeux sociaux.",
      document2: "La télévision peut également présenter certains inconvénients. Les émissions télévisées peuvent parfois véhiculer des stéréotypes... Il est important de faire preuve de discernement et de réguler l'exposition à la télévision.",
      mots_min: 120,
      mots_max: 180
    }
  },
  11: {
    1: "Votre ami Cédric a accepté de garder votre maison et jardin pendant vos vacances. Écrivez un message pour lui dire ce qu’il doit faire.",
    2: "Suite à un voyage récent effectué avec une agence de voyages, vous êtes insatisfait(e) des prestations reçues. Rédigez un courriel de réclamation en exprimant votre mécontentement. Décrivez les problèmes rencontrés et demandez une solution de la part de l’agence.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LA RESTAURATION RAPIDE",
      document1: "Les restaurants rapides proposent des plats équilibrés et variés, et ils respectent les normes d’hygiène et les variétés de produits qui sont bons, et c’est le client qui compose son menu, donc il en est responsable.",
      document2: "Les spécialistes affirment que manger régulièrement dans des restaurants de fast-food, qui proposent de la restauration rapide, est dangereux pour la santé. La nourriture servie est souvent la même : frites, hamburgers et boissons sucrées. Ces aliments contiennent une grande quantité de calories, bien trop pour un seul repas. De plus, la plupart des produits dans ces restaurants sont emballés dans du plastique. Par conséquent, manger dans un fast-food augmente la production de déchets plastiques, ce qui est nuisible pour l’environnement.",
      mots_min: 120,
      mots_max: 180
    }
  },
  12: {
    1: "Vous souhaitez faire du sport et vous voulez que votre ami vous accompagne. Écrivez-lui un message pour lui proposer de pratiquer ensemble.",
    2: "Vous avez déjà étudié dans une université à l’étranger. Écrivez un article sur votre Blog pour raconter cette expérience.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "L’UNIFORME SCOLAIRE : POUR OU CONTRE ?",
      document1: "Le port de l’uniforme étouffe et écrase la personnalité des garçons. Ils ne peuvent s’habiller comme ils veulent, en aucune circonstance. De l’autre côté de l’échelle (chez les pros) il y a des gens qui préféraient pour eux-mêmes et leurs enfants, avoir la possibilité de s’exprimer à travers l’habillement, en décidant eux-mêmes ce qu’ils porteraient chaque jour. Ainsi, avec un uniforme, les jeunes qui aiment s’exprimer à travers la mode, se démarquer de la foule grâce à un accessoire ou un vêtement particulier, se retrouveront déçus et emprisonnés dans l’uniforme.",
      document2: "Le port de l’uniforme développe un sentiment d’appartenance à son établissement, et à la communauté des élèves. Il nourrit chez le jeune le sens du collectif et engendre souvent la fierté d’appartenir à son établissement. De plus, il réduit la discrimination basée sur le style ou sur la classe sociale de l’élève. En effet, l’uniforme permet aux parents d’économiser beaucoup d'argent, ce ne sont pas tous les parents qui peuvent payer à leurs enfants de beaux vêtements griffés ou de marques populaires. La mise en place d’un code vestimentaire réduit donc les différences entre les classes sociales.",
      mots_min: 120,
      mots_max: 180
    }
  },
  13: {
    1: "Écrivez un message dans le journal de votre université pour rechercher un partenaire avec qui faire du sport.",
    2: "Écrivez dans un article de blog pour raconter votre arrivée dans un pays étranger en donnant vos impressions.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "RÔLE DE LA TÉLÉVISION DANS L’ÉDUCATION DES ENFANTS",
      document1: "La télévision est un outil de communication et de divertissement largement répandu dans notre société moderne. Son influence est incontestable, tant sur les individus que sur la culture en général. Elle permet de diffuser des informations, d’offrir des divertissements variés et de favoriser la diffusion de la culture. La télévision est présente dans de nombreux foyers et constitue une source d’information et de divertissement accessibles à tous. Grâce à sa portée et à sa capacité à toucher un large public, la télévision joue un rôle important dans la transmission des connaissances et la sensibilisation aux enjeux sociaux.",
      document2: "La télévision peut également présenter certains inconvénients. Les émissions télévisées peuvent parfois véhiculer des stéréotypes, des préjugés et des valeurs discutables. De plus, le temps passé devant la télévision peut réduire le temps consacré à d’autres activités plus enrichissantes, telles que la lecture, les interactions sociales ou la pratique d’un sport. Il est important de faire preuve de discernement et de réguler l’exposition à la télévision, en particulier pour les enfants, afin de préserver un équilibre sain entre les différentes formes d’apprentissage et de divertissement.",
      mots_min: 120,
      mots_max: 180
    }
  },
  14: {
    1: "Je suis votre amie Anna et je compte passer un weekend dans ta ville. Donnez-moi des informations sur les moyens de transport pour explorer la ville. Répondez à Anna dans un message.",
    2: "Vous avez assisté à une fête de voisins du quartier, écrivez un blog pour montrer pourquoi vous avez aimé cette fête.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES DISTRIBUTEURS AUTOMATIQUES DANS LES ÉCOLES",
      document1: "Je suis en faveur des distributeurs de boissons dans les lycées. Premièrement, ils offrent une commodité supplémentaire pour les élèves, notamment pour ceux qui n’ont pas le temps de passer à la cafétéria pendant les pauses. Deuxièmement, s’ils sont bien gérés, ces distributeurs peuvent offrir une gamme de boissons saines, comme de l’eau, du jus de fruits pur et des boissons aux fruits sans sucre ajouté. Ces distributeurs peuvent être une source de revenus supplémentaire pour l’école, qui peut être réinvestie dans l’amélioration des infrastructures ou des programmes scolaires.",
      document2: "Je suis contre l’installation de distributeurs de boissons dans les lycées. Ma principale préoccupation est liée à la santé des élèves. Malheureusement, beaucoup de ces distributeurs sont remplis de boissons sucrées et de sodas qui contribuent à l’obésité infantile et à d’autres problèmes de santé comme le diabète. Même les jus de fruits, qui peuvent sembler sains, contiennent souvent beaucoup de sucre. Les écoles devraient être des lieux qui encouragent des habitudes alimentaires saines et je crains que la présence de ces distributeurs n’encourage une consommation excessive de boissons sucrées.",
      mots_min: 120,
      mots_max: 180
    }
  },
  15: {
    1: "Je vais bientôt vivre dans ton quartier. Je cherche un endroit sympathique pour faire mes courses. Est-ce que tu connais un marché intéressant ? Merci d’avance et à bientôt ! Bernard Vous répondez à votre ami Bernard. Dans votre message, vous décrivez un marché de votre quartier que vous aimez bien (lieu, horaires, produits, etc.).",
    2: "Vous faites partie d’une association de quartier qui propose des activités aux enfants (aide aux devoirs, sorties, jeux, etc.). Sur votre site internet, vous racontez votre expérience et vous expliquez pourquoi ce type d’association est utile.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LE LIVRE PAPIER OU LE LIVRE NUMÉRIQUE ?",
      document1: "Depuis plusieurs années maintenant, de nombreux lecteurs ont décidé de remplacer la bibliothèque traditionnelle par des livres numériques. Selon eux, l’avantage est avant tout économique. D’une part, le livre numérique permet d’économiser du papier, d’autre part la version numérique d’un livre est généralement moins chère que la version papier. Les livres numériques ont un autre avantage : ils permettent une ouverture sur le monde pour les personnes en situation de handicap. Certaines options, comme la possibilité d’augmenter la taille des lettres, facilitent la lecture pour les personnes malvoyantes.",
      document2: "Le livre numérique remplacera-t-il le livre papier ? « Non », répondront la plupart des lecteurs. Le livre papier est un beau support. Quel plaisir de le prêter aux gens qu’on aime ou de l’offrir en glissant un petit mot dedans ! Le livre papier a une histoire, l’odeur du neuf ou de l’ancien… Il transmet beaucoup d’émotions alors que le livre numérique à un côté un peu impersonnel. De plus, les livres numériques demandent de posséder un minimum de connaissances en informatique, ce qui peut être une difficulté pour certaines personnes.",
      mots_min: 120,
      mots_max: 180
    }
  },
  16: {
    1: "Je cherche un endroit pour déjeuner en plein air ce week-end. Qu’est-ce que tu me proposes ? À bientôt, Barbara Vous répondez à votre amie Barbara en décrivant le lieu (parc, jardin, terrasse, etc.).",
    2: "Vous avez visité un nouveau pays pendant vos vacances. Sur un site internet, racontez votre expérience et donnez votre opinion sur ce pays.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "L’UTILISATION DU PLASTIQUE : POUR OU CONTRE ?",
      document1: "Franck soutient l’utilisation limitée du plastique, soulignant son importance dans de nombreux secteurs, notamment les secteurs médical et alimentaire. Pour lui, le plastique est vital pour la conservation des aliments et la stérilisation des équipements médicaux. Il prône une utilisation responsable et le recyclage, mais reconnaît que certains usages du plastique sont indispensables pour la société moderne.",
      document2: "Amicha s’oppose fermement à l’utilisation du plastique, mettant en avant son impact environnemental dévastateur. Elle soutient que les déchets plastiques polluent les océans et les écosystèmes, causant des dommages irréparables. Amicha milite pour des alternatives écologiques et durables, insistant sur l’urgence de renoncer au plastique pour protéger l’environnement et la santé publique.",
      mots_min: 120,
      mots_max: 180
    }
  },
  17: {
    1: "Votre ami(e) veut découvrir la région dans laquelle vous habitez. Écrivez lui un message pour lui proposer des sites à visiter.",
    2: "Vous avez participé à un cours de sport dans une salle. Écrivez un article de blog parlant de cette expérience et en exprimant également votre avis par rapport à cette salle.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LIVRAISON DES REPAS AU BUREAU : POUR OU CONTRE ?",
      document1: "Grâce à la livraison en entreprise, les employés bénéficieront d’un gain de temps notable. Il n’est plus question d’aller sortir loin du lieu de travail pour trouver de quoi manger. En complément, l’argent et l’énergie économisée permettent d’être encore plus efficace au travail. Sans pour autant mettre fin à une session importante liée au travail, le repas sera déjà prêt et pourra attendre la fin d’une conférence, d’une réunion ou d’un rendez-vous. Il s’agit d’une véritable solution dédiée aux entreprises ayant une activité intense et qui requiert la présence continue de leurs employés.",
      document2: "Cette pratique révèle souvent des inconvénients à cause de sa notoriété montante. Certains jours, il arrive que les responsables de livraisons puissent être envahis par un grand nombre de livraisons à faire et cela risque de générer des perturbations liées au stress de l’attente. De même pour les employés, une trop longue heure de travail peut causer un état de fatigue si ce dernier ne quitte pas son bureau pour le repas. Dans tous les cas, il est recommandé de toujours marquer des temps de pause lors des durs labeurs.",
      mots_min: 120,
      mots_max: 180
    }
  },
  18: {
    1: "Salut, Tu as commencé ton nouveau travail ! C’est comment ? Tu es content(e) ? Ali Vous répondez à votre ami Ali. Dans votre message, vous décrivez votre nouveau travail (lieu, collègues, etc.) et vous donnez vos impressions.",
    2: "INFOS FAMILLES Vivre avec une personne âgée: comment faire ? Notre site cherche des témoignages. Vous avez vécu avec une personne âgée. Vous racontez votre expérience.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES COURS DE LANGUES EN LIGNE",
      document1: "Apprendre une langue en ligne grâce à Internet, c’est possible et cela donne de bons résultats ! Contrairement aux cours classiques, on peut apprendre quand on veut : les cours sont disponibles tout le temps. Cela permet de mieux organiser sa journée. On n’a pas non plus besoin de faire des kilomètres pour aller dans une école de langues. On peut apprendre de son salon, de son bureau ou même d’un café près de chez soi ! Cela permet aussi de faire des économies.",
      document2: "Cela semble facile d’apprendre une langue en ligne mais ce n’est pas possible pour tout le monde. En effet, il faut avoir une bonne connexion à Internet et un outil numérique adapté (ordinateur, smartphone, tablette) pour apprendre en ligne. De plus, il faut être très autonome pour être capable d’apprendre seul : il est difficile de se mettre au travail chez soi et de rester motivé quand on n’a pas l’aide d’un professeur et de collègues. Dans ces conditions, on peut se décourager et abandonner très vite.",
      mots_min: 120,
      mots_max: 180
    }
  },
  19: {
    1: "Salut ! Je cherche un endroit pour déjeuner en plein air ce week-end. Qu’est-ce que tu me proposes ? A bientôt, Barbara. Vous répondez à votre amie Barbara. Vous décrivez le lieu (parc, jardin, terrasse, etc.)",
    2: "Vous avez visité un nouveau pays pendant vos vacances. Sur un site internes, vous racontez votre expérience et vous donnez votre opinion sur ce pays.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "L'IMPACT DU PLASTIQUE : ENTRE POLLUTION ET UTILITÉ",
      document1: "Chaque année, des millions de tonnes de plastiques sont déversées dans les océans, où elles s’accumulent et se fragmentent en petits morceaux. Ces déchets plastiques ont des effets désastreux sur la faune et la flore marines, qui les ingèrent. Les plastiques menacent ainsi la santé des écosystèmes marins, mais aussi la nôtre, car ils peuvent remonter dans la chaîne alimentaire. Il est urgent de réduire notre consommation de plastiques et de les éliminer à la source, avant qu’ils n’atteignent les océans.",
      document2: "Le plastique est un matériau indispensable dans le domaine de la santé. Il permet de fabriquer des dispositifs médicaux, tels que des seringues, des cathéters, des prothèses, des implants, des pansements, etc. Ces dispositifs sont souvent jetables, résistants, et adaptés aux besoins des patients. Le plastique contribue ainsi à la prévention des infections, à la réduction des douleurs, à l’amélioration de la qualité de vie, et à la sauvegarde de nombreuses vies. Il est donc un allié de la médecine, qui apporte des solutions innovantes et efficaces.",
      mots_min: 120,
      mots_max: 180
    }
  },
  20: {
    1: "L’été est arrivé ! Je vous propose de faire un pique-nique samedi prochain. Connaissez-vous un endroit sympa pour les enfants et les adultes où nous pouvons tous nous retrouver ? Bisous, à bientôt. Léa” Vous acceptez l’invitation de Léa et vous lui proposez un endroit pour organiser le pique-nique. Vous décrivez le lieu et expliquez quelles sont les activités possibles.",
    2: "“Salut, tu vas bien ? Nous avons deux semaines de vacances en janvier. Nous allons venir visiter ton pays. Nous cherchons à visiter des sites historiques et à découvrir de nouveaux plats. Qu’est-ce que tu nous conseilles ? Aaron & Perla” Vous répondez à Aaron et Perla pour leur faire des propositions et justifiez votre choix en racontant vos dernières vacances.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "MANGER À L'EXTÉRIEUR OU CHEZ SOI ?",
      document1: "Aïcha, jeune célibataire française de 28 ans, refuse de prendre ses repas seule chez elle. « Me retrouver avec un plateau repas devant la télé, non merci ! Vivre à Lyon me donne la possibilité de dîner à l’extérieur, où je veux et à n’importe quelle heure. Pourquoi m’en priver ? Je trouve aussi génial de pouvoir partager des moments de convivialité avec tous mes amis, ce qui est impossible dans mon petit appartement. Et puis, c’est vrai, peu de gens de ma génération ont la patience et le talent pour préparer des petits plats maison. »",
      document2: "Laura, mère de famille de 45 ans, déclare : « Dîner au restaurant est un luxe que je peux rarement m’offrir avec mon salaire de vendeuse. Bien sûr, j’aimerais parfois éviter de faire la cuisine et pouvoir sortir au restaurant, mais pour une famille de cinq personnes, la dépense est énorme ! Et puis je trouve que la qualité des plats servis dans les restaurants est très moyenne. Le rapport qualité-prix n’est pas toujours au rendez-vous. Au moins, en mangeant à la maison, je sais ce qu’il y a dans mon assiette. »",
      mots_min: 120,
      mots_max: 180
    }
  },
  21: {
    1: "Vous avez lu une annonce sur un site internet qui propose d’aider ceux qui souhaitent apprendre le français en les mettant en contact avec des partenaires linguistiques. Envoyez un courriel en vous présentant et en expliquant pourquoi vous souhaitez pratiquer le français.",
    2: "Vous avez assisté à une fête de famille. Envoyez un message à vos amis pour leur raconter cette fête et expliquez ce que vous avez le plus apprécié.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES INTERDICTIONS DE CIRCULATION EN ZONES URBAINES : AVANTAGES ET DÉFIS",
      document1: "Avec des taux de pollution alarmants constatés dans plusieurs endroits dans le monde, plusieurs villes ont réussi leur pari d’interdire la circulation de voitures en zones urbaines. La capitale de la Norvège, Oslo, a récemment opté pour cette solution et s’en félicite estimant que c’est une décision bénéfique pour tout le monde. Après un certain temps, les accidents diminuent, la dépendance au pétrole baissera et la qualité d’air sera meilleure.",
      document2: "Beaucoup de villes se lancent dans des projets d’interdiction de voitures en zone urbaine sans mettre en place les outils et les infrastructures nécessaires pour réussir cette transition. Certes, en diminuant les voitures, on aura moins d’embouteillages, de stress et surtout un air beaucoup moins pollué, mais en contrepartie, il faut prévoir entre- autres de gigantesques parkings pour garer les voitures, opter davantage pour le transport en commun (métros et bus) et prévoir des autorisations de circulation pour certains corps de métiers (comme la police, les urgentistes, les livreurs, …).",
      mots_min: 120,
      mots_max: 180
    }
  },
  22: {
    1: "Vous voulez organiser une fête. Écrivez un message à vos amis pour les inviter et de vous aider à l’organiser (lieu, date, thème, etc.).",
    2: "Vous avez participé à une compétition sportive, racontez votre expérience sur un site internet et donnez votre avis (lieu, date, organisation).",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "MENUS SANS VIANDE À LA CANTINE SCOLAIRE",
      document1: "De plus en plus d’écoles décident de mettre en place un menu sans viande dans les cantines, au moins deux fois par semaine. Certaines études ont montré que les enfants consomment trop de protéines animales. C’est donc une question de santé : les écoles ont choisi de remplacer la viande par d’autres produits (soja, céréales, légumes), moins gras et utiles à la croissance des enfants. Ces menus sans viandes à la cantine reviennent moins cher aux familles. Cette idée plaît beaucoup aux parents comme aux enfants.",
      document2: "La décision de supprimer la viande dans les cantines ne plaît pas à tout le monde. En effet, c’est un produit cher : la cantine est le seul endroit où les enfants de familles en difficulté peuvent manger. Les producteurs locaux de viande sont également mécontents : une partie de leur production est réservée aux cantines, il s’agit donc d’une perte financière. Enfin, beaucoup d’enfants interrogés déclarent tout de même préférer les steaks de boeuf aux steaks de soja qui, selon eux, ont peu de goût.",
      mots_min: 120,
      mots_max: 180
    }
  },
  23: {
    1: "Votre ami(e) cherche un cadeau original pour l’anniversaire d’un proche. Écrivez-lui un message pour lui suggérer une idée de cadeau et expliquer pourquoi ce serait un bon choix.",
    2: "Vous venez de terminer un cours de cuisine en ligne. Écrivez un commentaire sur le site pour donner votre avis sur cette formation (contenu, instructeur, points positifs et négatifs).",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LE COVOITURAGE : UNE SOLUTION D’AVENIR ?",
      document1: "Le covoiturage connaît un essor considérable ces dernières années. Il permet de réduire les coûts de transport pour les conducteurs et les passagers, tout en diminuant le nombre de voitures sur les routes. Des plateformes numériques facilitent la mise en relation entre conducteurs et passagers, rendant ce mode de transport accessible à tous. En plus des avantages économiques, le covoiturage contribue à réduire les émissions de CO2 et favorise les rencontres entre personnes de milieux différents.",
      document2: "Malgré ses avantages, le covoiturage présente certaines limites. La dépendance à une autre personne pour ses déplacements peut être contraignante, notamment en cas d’imprévu ou de retard. Les questions de sécurité et de confiance envers des inconnus restent aussi un frein pour de nombreuses personnes. De plus, en milieu rural, le manque de trajets disponibles rend ce service peu pratique. Certains experts estiment que le covoiturage ne peut pas remplacer un réseau de transports en commun bien développé.",
      mots_min: 120,
      mots_max: 180
    }
  },
  24: {
    1: "Vous avez assisté à un événement culturel (concert, exposition, festival) dans votre ville. Écrivez un message à un(e) ami(e) pour lui raconter votre expérience et lui donner envie d’y aller.",
    2: "Vous venez de faire du bénévolat dans une organisation locale. Rédigez un article pour le journal de votre école ou université pour partager cette expérience et encourager d’autres étudiants à s’engager.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LES BIBLIOTHÈQUES À L’ÈRE DU NUMÉRIQUE",
      document1: "Les bibliothèques traditionnelles restent des lieux essentiels pour l’accès à la culture et au savoir. Elles offrent un espace calme propice à la concentration, un accès gratuit à des milliers de livres et de ressources documentaires, ainsi qu’un accompagnement personnalisé par des bibliothécaires qualifiés. Pour beaucoup d’étudiants et de chercheurs, la bibliothèque demeure un endroit irremplaçable pour travailler et se documenter sérieusement.",
      document2: "Avec l’avènement du numérique, les habitudes de lecture évoluent rapidement. Les livres électroniques, les bases de données en ligne et les plateformes de streaming culturel permettent d’accéder à des contenus depuis n’importe où et à n’importe quel moment. Certains considèrent que les bibliothèques physiques sont désormais dépassées et que les budgets qui leur sont alloués pourraient être mieux utilisés pour développer des ressources numériques accessibles à tous.",
      mots_min: 120,
      mots_max: 180
    }
  },
  25: {
    1: "Un(e) ami(e) d’enfance reprend contact avec vous après plusieurs années. Écrivez-lui un message pour lui donner des nouvelles de votre vie actuelle (travail, famille, projets, etc.).",
    2: "Vous avez récemment changé de quartier ou de ville. Rédigez un article de blog pour comparer votre ancien et votre nouveau lieu de vie et expliquer ce que vous préférez.",
    3: {
      consigne: "Faites un court texte (120-180 mots) qui compare les points de vue et exprime votre opinion.",
      titre: "LE TOURISME DE MASSE : RICHESSE OU MENACE ?",
      document1: "Le tourisme de masse génère des retombées économiques importantes pour les régions qui l’accueillent. Il crée des emplois dans les secteurs de l’hôtellerie, de la restauration et des transports, et permet à des populations locales d’améliorer leurs conditions de vie. Certaines villes qui souffraient de déclin économique ont retrouvé une nouvelle dynamique grâce à l’afflux de visiteurs. Le tourisme favorise également les échanges culturels et la compréhension entre les peuples.",
      document2: "Cependant, le tourisme de masse provoque des nuisances considérables dans les zones les plus fréquentées. La surfréquentation dégrade les sites naturels et patrimoniaux, pollue l’environnement et perturbe la vie quotidienne des habitants. Les prix des logements s’envolent, poussant les résidents locaux vers les périphéries. Des villes comme Venise ou Barcelone cherchent aujourd’hui à limiter le nombre de touristes pour préserver leur cadre de vie et leur identité culturelle.",
      mots_min: 120,
      mots_max: 180
    }
  }
};