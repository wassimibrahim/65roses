/**
 * Contacts. Professionally relevant information only — no personal detail
 * beyond what belongs in a transaction file.
 */

export interface PersonSeed {
  firstName: string;
  lastName: string;
  title: string;
  /** Organisation name, where the person sits inside one. */
  organisation?: string;
  /** Institution name, where the person's role is at a school. */
  institution?: string;
  family?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  languages: string[];
  location: string;
  interests?: string[];
  notes?: string;
  internal?: boolean;
}

export const TERRA_PEOPLE: PersonSeed[] = [
  {
    firstName: "Fouad",
    lastName: "Nasr",
    title: "Managing Partner",
    email: "fouad@terracapital.es",
    languages: ["English", "Spanish", "French", "Arabic"],
    location: "Madrid",
    interests: ["Founder transitions", "Education real estate"],
    internal: true,
  },
  {
    firstName: "Elena",
    lastName: "Márquez",
    title: "Partner",
    email: "elena@terracapital.es",
    languages: ["Spanish", "English", "Catalan"],
    location: "Madrid",
    interests: ["K–12 operators", "Sell-side execution"],
    internal: true,
  },
  {
    firstName: "Tomás",
    lastName: "Rivera",
    title: "Associate",
    email: "tomas@terracapital.es",
    languages: ["Spanish", "English", "Portuguese"],
    location: "Madrid",
    interests: ["Valuation", "Iberian market mapping"],
    internal: true,
  },
  {
    firstName: "Sofia",
    lastName: "Lange",
    title: "Analyst",
    email: "sofia@terracapital.es",
    languages: ["English", "German", "Spanish"],
    location: "Madrid",
    interests: ["Market research", "Real-estate analysis"],
    internal: true,
  },
];

export const PEOPLE: PersonSeed[] = [
  // ── Owners and school leadership ──────────────────────────────────────────
  {
    firstName: "Ignacio",
    lastName: "Serra",
    title: "Founder & Executive President",
    institution: "Colegio Monteverde",
    family: "Serra",
    languages: ["Spanish", "English"],
    location: "Madrid",
    interests: ["Educational philosophy", "Classical music"],
    notes:
      "Founded the school in 1974 and still chairs the pedagogical committee. Has said publicly that the school's name and character matter more to him than any number.",
  },
  {
    firstName: "Marta",
    lastName: "Serra",
    title: "Director of Admissions",
    institution: "Colegio Monteverde",
    family: "Serra",
    languages: ["Spanish", "English", "French"],
    location: "Madrid",
    notes: "Daughter of the founder. Works in the school but not in the operating leadership.",
  },
  {
    firstName: "Pablo",
    lastName: "Serra",
    title: "Architect",
    family: "Serra",
    languages: ["Spanish", "English"],
    location: "Barcelona",
    notes: "Son of the founder. Works outside education; no operational role.",
  },
  {
    firstName: "Rosa",
    lastName: "Domínguez",
    title: "Head of School",
    institution: "Colegio Monteverde",
    languages: ["Spanish", "English"],
    location: "Madrid",
    notes: "Appointed 2021. First non-family head in the school's history.",
  },
  { firstName: "Charles", lastName: "Weston", title: "Chairman", institution: "British College of Alcobendas", family: "Weston-Ruiz", languages: ["English", "Spanish"], location: "Madrid" },
  { firstName: "Isabel", lastName: "Ruiz Weston", title: "Managing Director", institution: "British College of Alcobendas", family: "Weston-Ruiz", languages: ["Spanish", "English"], location: "Madrid", notes: "Second generation; runs the business day to day." },
  { firstName: "Jordi", lastName: "Puig", title: "Chairman", institution: "Institut Sant Jordi", family: "Puig", languages: ["Catalan", "Spanish"], location: "Barcelona" },
  { firstName: "Núria", lastName: "Camps", title: "General Manager", institution: "Institut Sant Jordi", languages: ["Catalan", "Spanish", "English"], location: "Barcelona", notes: "Professional manager appointed 2023." },
  { firstName: "Daniel", lastName: "Halloran", title: "Founder & Director", institution: "American Academy of Valencia", family: "Halloran", languages: ["English", "Spanish"], location: "Valencia" },
  { firstName: "Hermana", lastName: "Beatriz Ochoa", title: "Provincial Superior", institution: "Colegio San Rafael", languages: ["Spanish"], location: "Seville" },
  { firstName: "Aitor", lastName: "Garaikoetxea", title: "Head of School", institution: "Highfield International Bilbao", languages: ["Spanish", "Basque", "English"], location: "Bilbao" },
  { firstName: "Carmen", lastName: "Ortega", title: "Founder", institution: "Colegio Los Almendros", family: "Ortega", languages: ["Spanish", "English"], location: "Málaga", notes: "Also owns the adjacent plot personally." },
  { firstName: "Luis", lastName: "Ortega", title: "Operations Director", institution: "Colegio Los Almendros", family: "Ortega", languages: ["Spanish"], location: "Málaga" },
  { firstName: "Ramón", lastName: "Cobo", title: "Founder & Director", institution: "Escuela Internacional del Norte", family: "Cobo", languages: ["Spanish", "English"], location: "Santander" },
  { firstName: "Alfonso", lastName: "Villanueva", title: "Chairman", institution: "Colegio Villanueva", family: "Villanueva", languages: ["Spanish"], location: "Madrid", notes: "Stepped back from executive duties in 2025." },
  { firstName: "Beatriz", lastName: "Villanueva", title: "Board Member", institution: "Colegio Villanueva", family: "Villanueva", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Gonzalo", lastName: "Herrera", title: "Managing Director", institution: "Colegio Villanueva", languages: ["Spanish", "English"], location: "Madrid", notes: "First non-family MD, appointed January 2025." },
  { firstName: "Javier", lastName: "Lacasa", title: "Director", institution: "Nuevo Horizonte Zaragoza", family: "Lacasa", languages: ["Spanish"], location: "Zaragoza" },
  { firstName: "Anneke", lastName: "Kessler", title: "Founder & Principal", institution: "Colegio Puerta del Mar", family: "Kessler", languages: ["English", "German", "Spanish"], location: "Marbella" },
  { firstName: "Enrique", lastName: "Bergua", title: "Founder", institution: "Instituto Politécnico Ebro", family: "Bergua", languages: ["Spanish"], location: "Zaragoza" },
  { firstName: "Pilar", lastName: "Del Río", title: "Founder & Director", institution: "Centro de Estudios Aranjuez", family: "Del Río", languages: ["Spanish"], location: "Aranjuez" },
  { firstName: "Cristina", lastName: "Aguirre", title: "Head of School", institution: "Colegio Mirasierra Bilingüe", family: "Aguirre", languages: ["Spanish", "English"], location: "Madrid", notes: "Daughter of the founder; became head in 2024." },
  { firstName: "Manuel", lastName: "Aguirre", title: "Founder", institution: "Colegio Mirasierra Bilingüe", family: "Aguirre", languages: ["Spanish"], location: "Madrid" },
  { firstName: "Teresa", lastName: "Navarro", title: "Founder & Director", institution: "Liceo Europeo de Alicante", family: "Navarro", languages: ["Spanish", "English", "German"], location: "Alicante" },
  { firstName: "Rui", lastName: "Marques", title: "Founder & CEO", institution: "Escola Nova Lisboa", family: "Marques", languages: ["Portuguese", "English"], location: "Lisbon" },
  { firstName: "Ana", lastName: "Teixeira", title: "Chair", institution: "Colégio do Porto Internacional", family: "Teixeira", languages: ["Portuguese", "English"], location: "Porto" },
  { firstName: "Miguel", lastName: "Sousa", title: "Founder", institution: "Algarve International Academy", family: "Sousa", languages: ["Portuguese", "English"], location: "Faro" },
  { firstName: "Paolo", lastName: "Ferrante", title: "Chairman", institution: "Scuola Internazionale di Milano", family: "Ferrante", languages: ["Italian", "English"], location: "Milan" },
  { firstName: "Giulia", lastName: "Riva", title: "Founder & Director", institution: "Liceo Bilingue Roma Nord", family: "Riva", languages: ["Italian", "English"], location: "Rome" },
  { firstName: "Céline", lastName: "Dumont", title: "Directrice Générale", institution: "École Bilingue de Lyon", family: "Dumont", languages: ["French", "English"], location: "Lyon" },
  { firstName: "Henry", lastName: "Aldridge", title: "Principal & Owner", institution: "Thames Valley Preparatory", family: "Aldridge", languages: ["English"], location: "Reading" },
  { firstName: "Andreas", lastName: "Brunner", title: "Chairman", institution: "Zürich Academy of Sciences", family: "Brunner", languages: ["German", "English", "French"], location: "Zurich" },
  { firstName: "Khalid", lastName: "Al Muhairi", title: "Founder & Chairman", institution: "Emirates British Academy", family: "Al Muhairi", languages: ["Arabic", "English"], location: "Dubai" },
  { firstName: "Nuria", lastName: "Bermejo", title: "Chair", institution: "Colegio Guadarrama", family: "Bermejo", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Salvador", lastName: "Reyes", title: "Director", institution: "Colegio Andalus Granada", family: "Reyes", languages: ["Spanish"], location: "Granada" },
  { firstName: "Xoán", lastName: "Figueroa", title: "Founder", institution: "Colegio Vigo Atlántico", family: "Figueroa", languages: ["Spanish", "Galician"], location: "Vigo" },
  { firstName: "Bea", lastName: "Lorenzo", title: "Founder & CEO", institution: "Little Acorns Early Years Group", family: "Lorenzo", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Álvaro", lastName: "Cano", title: "Founder", institution: "Academia Idiomas Sevilla", family: "Cano", languages: ["Spanish", "English"], location: "Seville" },
  { firstName: "Marc", lastName: "Mas", title: "Founder & Director", institution: "Colegio Costa Brava", family: "Mas", languages: ["Catalan", "Spanish", "English"], location: "Girona" },
  { firstName: "Rocío", lastName: "Cañizares", title: "Director", institution: "Colegio Cervantes Toledo", family: "Cañizares", languages: ["Spanish"], location: "Toledo" },
  { firstName: "Vicent", lastName: "Belda", title: "Founder & CEO", institution: "Instituto Tecnológico Levante", family: "Belda", languages: ["Spanish", "Valencian", "English"], location: "Valencia" },
  { firstName: "Adriana", lastName: "Iglesias", title: "Founder & President", institution: "Madrid Global Business School", family: "Iglesias", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Idoia", lastName: "Arrieta", title: "Founder", institution: "Escuela Montessori Pamplona", family: "Arrieta", languages: ["Spanish", "Basque"], location: "Pamplona" },
  { firstName: "Fernando", lastName: "Quirós", title: "Director", institution: "Colegio Alameda Oviedo", family: "Quirós", languages: ["Spanish"], location: "Oviedo" },
  { firstName: "Lucía", lastName: "Pardo", title: "Director", institution: "Colegio Bahía de Cádiz", family: "Pardo", languages: ["Spanish"], location: "Cádiz" },

  // ── Buy-side ──────────────────────────────────────────────────────────────
  { firstName: "Rebecca", lastName: "Ellison", title: "Group Development Director", organisation: "Cognita", languages: ["English", "Spanish"], location: "London", interests: ["Iberian expansion"] },
  { firstName: "Carlos", lastName: "Mendoza", title: "Head of Spain", organisation: "Cognita", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Priya", lastName: "Raman", title: "M&A Director", organisation: "International Schools Partnership", languages: ["English"], location: "London" },
  { firstName: "Álex", lastName: "Ferrer", title: "Corporate Development", organisation: "Globeducate", languages: ["Spanish", "Catalan", "English"], location: "Barcelona" },
  { firstName: "James", lastName: "Whitfield", title: "Group M&A", organisation: "Inspired Education Group", languages: ["English", "Italian"], location: "London" },
  { firstName: "Sven", lastName: "Halberg", title: "Investment Director", organisation: "Nord Anglia Education", languages: ["English", "German"], location: "London" },
  { firstName: "Robert", lastName: "Nkemdirim", title: "Partner", organisation: "Northgate Education Partners", languages: ["English"], location: "London", interests: ["Founder partnerships", "Buy-and-build"] },
  { firstName: "Hannah", lastName: "Croft", title: "Principal", organisation: "Northgate Education Partners", languages: ["English", "Spanish"], location: "London" },
  { firstName: "Matteo", lastName: "Bellini", title: "Managing Partner", organisation: "Alpina Capital", languages: ["Italian", "English"], location: "Milan" },
  { firstName: "Inés", lastName: "Delgado", title: "Founding Partner", organisation: "Meridian Growth Partners", languages: ["Spanish", "English"], location: "Madrid", interests: ["Founder-led businesses"], notes: "Long-standing relationship with Fouad; they worked together before Terra." },
  { firstName: "Guillermo", lastName: "Sáenz", title: "Investment Director", organisation: "Meridian Growth Partners", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Patricia", lastName: "Losada", title: "Head of Acquisitions", organisation: "Iberian Social Infrastructure", languages: ["Spanish", "English"], location: "Madrid", interests: ["Sale-and-leaseback", "Long-lease covenants"] },
  { firstName: "Diego", lastName: "Rueda", title: "Investment Manager", organisation: "Castellana Real Assets", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Willem", lastName: "de Vries", title: "Director, Social Infrastructure", organisation: "Baltrum Infrastructure", languages: ["Dutch", "English", "German"], location: "Amsterdam" },
  { firstName: "Montserrat", lastName: "Casals", title: "Chief Investment Officer", organisation: "Casa Ventura Family Office", languages: ["Catalan", "Spanish", "English"], location: "Barcelona", interests: ["Long-hold minority positions"] },
  { firstName: "Lars", lastName: "Jensen", title: "Senior Portfolio Manager", organisation: "Öresund Pension", languages: ["Danish", "English"], location: "Copenhagen" },
  { firstName: "Omar", lastName: "Al Fahim", title: "Head of Education", organisation: "Gulf Education Holdings", languages: ["Arabic", "English"], location: "Abu Dhabi" },
  { firstName: "Salvador", lastName: "Ripoll", title: "Founder & CEO", organisation: "Iberian Schools Group", languages: ["Spanish", "English"], location: "Valencia", notes: "Fifty-eight. As likely to be a seller as a buyer within three years." },
  { firstName: "Nacho", lastName: "Vega", title: "Founder & CEO", organisation: "Vega Educación", languages: ["Spanish", "English"], location: "Madrid", interests: ["Bilingual model", "Founder earn-outs"] },
  { firstName: "Sara", lastName: "Bermúdez", title: "M&A Director", organisation: "Vega Educación", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Joana", lastName: "Almeida", title: "Development Director", organisation: "Lusitania Educação", languages: ["Portuguese", "Spanish", "English"], location: "Lisbon" },
  { firstName: "Ursula", lastName: "Steinmann", title: "Managing Director", organisation: "Helvetia Bildung Holding", languages: ["German", "English"], location: "Zug" },
  { firstName: "Théo", lastName: "Lambert", title: "Partner", organisation: "Aurelia Capital", languages: ["French", "English"], location: "Paris" },
  { firstName: "Consuelo", lastName: "Prat", title: "Director", organisation: "Terra Nova Learning Trust", languages: ["Spanish"], location: "Madrid" },

  // ── Advisers and intermediaries ───────────────────────────────────────────
  { firstName: "Elena", lastName: "Vidal", title: "Partner, Corporate", organisation: "Garrigues Peña Abogados", languages: ["Spanish", "English"], location: "Madrid", interests: ["Family-business governance"], notes: "Advises the Serra family on corporate matters. The most direct route to Ignacio Serra." },
  { firstName: "Ricardo", lastName: "Peña", title: "Managing Partner", organisation: "Garrigues Peña Abogados", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Marina", lastName: "Solís", title: "Director, Corporate Banking", organisation: "Banco Ibérico Corporate", languages: ["Spanish", "English"], location: "Madrid" },
  { firstName: "Andrés", lastName: "Cuéllar", title: "Managing Partner", organisation: "Cuéllar Auditores", languages: ["Spanish"], location: "Madrid", notes: "Audits several family-owned Madrid schools." },
  { firstName: "Bruno", lastName: "Ferrán", title: "Director", organisation: "Serra Patrimonio", family: "Serra", languages: ["Spanish"], location: "Madrid", notes: "Runs the Serra family's property holding company." },
];
