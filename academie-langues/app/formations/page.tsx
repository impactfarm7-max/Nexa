"use client";

import Link from "next/link";
import { 
  GraduationCap, 
  Lock, 
  ArrowRight, 
  Globe2, 
  BookOpen, 
  Languages, 
  Star,
  Sparkles
} from "lucide-react";

export default function FormationsCatalogue() {
  
  // Catalogue des futures formations (bloquées)
  const futureCourses = [
    {
      id: "anglais",
      title: "Anglais (IELTS / TOEFL)",
      description: "Maîtrisez la langue de Shakespeare pour vos projets internationaux et professionnels.",
      icon: Globe2,
      level: "A1 au C1",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      id: "allemand",
      title: "Allemand (Goethe)",
      description: "Atteignez le niveau B2 exigé pour étudier, vivre ou travailler en Allemagne.",
      icon: BookOpen,
      level: "A1 au B2",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20"
    },
    {
      id: "chinois",
      title: "Chinois (HSK)",
      description: "Ouvrez-vous les portes de l'Asie avec notre méthode d'apprentissage accélérée.",
      icon: Languages,
      level: "HSK 1 au 4",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20"
    }
  ];

  return (
    /* 🛠️ CORRECTION 1 : min-h-screen et overflow-x-hidden ajoutés ici */
    <div className="min-h-screen bg-neutral-50 pb-24 font-sans text-neutral-900 overflow-x-hidden">
      
      {/* HEADER PREMIUM */}
      <header className="bg-white/90 backdrop-blur-md border-b border-neutral-200/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-6 flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl md:rounded-2xl flex items-center justify-center border border-orange-200 shrink-0">
            <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black leading-tight text-neutral-900 tracking-tight">
              Formations NEXA
            </h1>
            <p className="text-[10px] md:text-sm text-neutral-500 font-medium mt-0.5 md:mt-1">
              Explorez notre catalogue et développez de nouvelles compétences.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        
        {/* SECTION 1 : MES FORMATIONS ACTIVES */}
        <section className="mb-10 md:mb-12">
          <div className="flex items-center gap-3 mb-5 md:mb-6">
            <h2 className="text-sm md:text-xl font-black text-neutral-900 uppercase tracking-widest whitespace-nowrap">
              Vos accès actifs
            </h2>
            <div className="h-px flex-1 bg-neutral-200"></div>
          </div>

          <Link href="/dashboard" className="block group">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden transition-transform duration-300 md:group-hover:-translate-y-1">
              
              {/* 🛠️ CORRECTION 2 : Effet visuel optimisé pour ne pas casser le mobile */}
              <div className="absolute -top-10 -right-10 w-48 h-48 md:w-64 md:h-64 bg-orange-500/10 rounded-full blur-2xl md:blur-3xl transition-all md:group-hover:bg-orange-500/20 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                    <Star className="w-6 h-6 md:w-7 md:h-7 text-white fill-white/20" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full mb-1.5 md:mb-2">
                      Formation Principale
                    </span>
                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight">TCF Canada Intensive</h3>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">Préparation complète : Écrit, Oral, Simulateur NEXA.</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto mt-2 md:mt-0">
                  <div className="text-left md:text-right mr-2">
                    <p className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-widest">Statut</p>
                    <p className="text-emerald-400 font-black text-xs md:text-sm">En cours</p>
                  </div>
                  <div className="flex-1 md:flex-none bg-orange-600 md:hover:bg-orange-500 text-white px-5 md:px-6 py-3 rounded-xl font-bold text-sm md:text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95">
                    Continuer <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

            </div>
          </Link>
        </section>

        {/* SECTION 2 : LE CATALOGUE (Bientôt disponible) */}
        <section>
          <div className="flex items-center gap-3 mb-5 md:mb-6">
            <h2 className="text-sm md:text-xl font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-orange-500 shrink-0" /> À venir
            </h2>
            <div className="h-px flex-1 bg-neutral-200"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {futureCourses.map((course) => {
              const Icon = course.icon;
              return (
                <div 
                  key={course.id} 
                  onClick={() => alert(`⏳ La formation ${course.title} est en cours de création. Restez à l'écoute !`)}
                  className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-neutral-200 shadow-sm relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-transform"
                >
                  {/* Overlay Filtre Gris + Cadenas au survol */}
                  <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] z-20 flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="bg-slate-900 text-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl">
                      <Lock className="w-3 h-3 text-orange-500" /> Bientôt
                    </div>
                  </div>

                  {/* Cadenas statique en haut à droite */}
                  <div className="absolute top-4 right-4 md:top-5 md:right-5 z-10">
                    <div className="w-8 h-8 bg-neutral-50 md:bg-neutral-100 rounded-full flex items-center justify-center border border-neutral-200 shadow-sm md:shadow-none">
                      <Lock className="w-3 h-3 md:w-4 md:h-4 text-neutral-400" />
                    </div>
                  </div>

                  {/* Contenu de la carte */}
                  <div className="relative z-10 transition-all duration-300 md:group-hover:grayscale">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 border ${course.bgColor} ${course.borderColor}`}>
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${course.color}`} />
                    </div>
                    
                    <span className="text-[9px] md:text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">
                      Objectif : {course.level}
                    </span>
                    <h3 className="text-base md:text-lg font-black text-neutral-900 leading-tight mb-2 pr-8">
                      {course.title}
                    </h3>
                    <p className="text-[11px] md:text-xs text-neutral-500 leading-relaxed font-medium">
                      {course.description}
                    </p>
                  </div>

                  {/* Fausse barre de progression */}
                  <div className="mt-5 md:mt-6 pt-4 border-t border-neutral-100 relative z-10">
                    <div className="w-full bg-neutral-50 md:bg-neutral-100 text-neutral-400 text-[10px] md:text-xs font-bold py-2.5 rounded-lg text-center uppercase tracking-widest flex items-center justify-center gap-2">
                      Verrouillé
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}