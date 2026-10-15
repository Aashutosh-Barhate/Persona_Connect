import type { Biography, ThemeOption, TraitScore } from '../types'

/**
 * Mock dataset for the local frontend. Ported from backend/seed.py (60 curated
 * biographies with OCEAN trait scores on a 0-100 scale).
 *
 * Trait scores are AI-estimated / manually curated ESTIMATES, not measured
 * psychometrics. The UI labels them as such.
 */

export const LIFE_STAGES = ['18-24', '25-34', '35-44', '45-54', '55+'] as const

export const CAREER_PHASES = [
  'Student',
  'Early career',
  'Mid-career',
  'Senior / leader',
  'Career change',
  'Retired',
] as const

export const THEMES: ThemeOption[] = [
  { id: 'creativity', label: 'Creativity & ideas', description: 'Imagination, original thinking, making things' },
  { id: 'discovery', label: 'Discovery & curiosity', description: 'Research, science, understanding the world' },
  { id: 'leadership', label: 'Leadership', description: 'Leading, organising, moving groups of people' },
  { id: 'adversity', label: 'Overcoming adversity', description: 'Setbacks, struggle, coming back from hard things' },
  { id: 'resilience', label: 'Resilience & grit', description: 'Persistence, endurance, not giving up' },
  { id: 'social-impact', label: 'Social impact', description: 'Helping others, justice, community' },
  { id: 'innovation', label: 'Innovation & building', description: 'Starting, engineering, creating new things' },
  { id: 'expression', label: 'Artistic expression', description: 'Voice, story, art, performance' },
  { id: 'discipline', label: 'Discipline & mastery', description: 'Practice, precision, craft' },
  { id: 'courage', label: 'Courage & conviction', description: 'Standing up, taking a stand, principle' },
]

export const CHALLENGE_LABELS: Record<string, string> = {
  adversity: 'War, exile or persecution',
  resilience: 'Recovery after setbacks',
  discipline: 'Years of relentless practice',
  discrimination: 'Discrimination and exclusion',
  skepticism: 'Doubt and ridicule from others',
  loss: 'Personal loss or grief',
  courage: 'Risking safety for a belief',
  scarcity: 'Starting with very little',
  health: 'Illness, injury or disability',
  failure: 'Public failure before success',
}

const THEME_KEYWORDS: Record<string, string[]> = {
  creativity: ['creativity', 'imagination', 'abstract', 'ideas', 'curiosity', 'polymath', 'vision', 'wonder'],
  discovery: [
    'research', 'theory', 'discovery', 'observation', 'breakthrough', 'cosmos', 'gravity', 'code',
    'logic', 'algorithms', 'semiconductor', 'prediction', 'space', 'calculation', 'precision',
    'physicist', 'mathematician', 'scientist', 'chemist', 'astrophysicist',
  ],
  leadership: [
    'leadership', 'leader', 'strategy', 'management', 'teamwork', 'competition', 'oratory',
    'eloquence', 'union', 'unity', 'stability', 'chancellor', 'president', 'prime minister',
    'president', 'ceo', 'captain', 'revolutionary', 'revolution',
  ],
  adversity: ['adversity', 'struggle', 'struggled', 'hardship', 'barrier', 'transformation', 'resistance', 'dignity', 'pain', 'attack'],
  resilience: [
    'perseverance', 'persistence', 'resilience', 'grit', 'determination', 'endurance',
    'relentless', 'recovery', 'excellence', 'fought', 'defeating',
  ],
  'social-impact': [
    'justice', 'empathy', 'compassion', 'community', 'education', 'advocacy', 'humanitarian',
    'rights', 'reconciliation', 'environment', 'empowerment', 'nonviolence', 'social',
    'welfare', 'girls', 'women', 'conservation', 'activist', 'activism', 'civil rights',
    'farmworkers', 'microfinance', 'poor', 'equality',
  ],
  innovation: [
    'innovation', 'invention', 'inventor', 'entrepreneurship', 'founded', 'built', 'engineer',
    'engineering', 'technology', 'product', 'brand', 'ai', 'transformation', 'media',
    'compiler', 'programming', 'design', 'startup', 'deepmind', 'apple', 'spanx', 'starbucks',
    'adobe', 'intel',
  ],
  expression: [
    'expression', 'narrative', 'voice', 'poetry', 'lyric', 'identity', 'painter', 'artist',
    'music', 'art', 'perform', 'dance', 'novel', 'novelist', 'writer', 'author', 'culture',
    'glam', 'pop', 'color', 'passion', 'communicator', 'communication', 'accessible',
    'playwright', 'poet', 'memoir', 'story',
  ],
  discipline: [
    'discipline', 'perfection', 'patience', 'focus', 'practice', 'routine', 'thorough',
    'value', 'speed', 'skill', 'methodical', 'work ethic', 'pragmatism', 'precision',
    'craft', 'mastery', 'meticulous', 'relentlessly',
  ],
  courage: [
    'courage', 'conviction', 'principle', 'truth', 'nonviolence', 'dissident', 'freedom',
    'spoke', 'risked', 'protest', 'challenge', 'authority', 'refusal', 'defied', 'boycott',
    'stood', 'sparked', 'strike',
  ],
}

const CHALLENGE_KEYWORDS: Record<string, string[]> = {
  adversity: ['war', 'apartheid', 'attack', 'shot', 'exile', 'prison', 'boycott', 'conflict', 'killed', 'oppressed', 'persecution'],
  resilience: ['persevered', 'persistence', 'despite', 'overcame', 'recovered', 'relentless', 'endured', 'resilience', 'obstacles', 'setbacks'],
  discipline: ['practiced', 'trained', 'rigorous', 'meticulous', 'obsessive', 'daily', 'thorough', 'perfectionist'],
  discrimination: ['discrimination', 'segregation', 'oppression', 'inequality', 'marginalized', 'racism', 'sexism', 'barriers', 'denied', 'excluded', 'first woman', 'first african american', 'first black'],
  skepticism: ['skeptics', 'orthodoxy', 'conventional wisdom', 'doubted', 'ridiculed', 'criticized', 'controversial', 'unproven', 'ignored'],
  loss: ['lost', 'death', 'grief', 'widowed', 'tragedy', 'mourning', 'died'],
  courage: ['spoke out', 'protest', 'dissident', 'risked', 'arrested', 'threatened', 'jailed', 'defied', 'refused', 'refusal'],
  scarcity: ['no funding', 'bootstrapped', 'savings', 'broke', 'poor', 'self-made', 'immigrant', 'refugee', '$5,000'],
  health: ['illness', 'diagnosed', 'injury', 'disability', 'pain', 'hospital', 'autism', 'condition'],
  failure: ['failed', 'failure', 'rejected', 'bankrupt', 'collapsed', 'setback'],
}

const CHALLENGE_TAG_MAP: Record<string, string> = {
  perseverance: 'resilience',
  persistence: 'resilience',
  resilience: 'resilience',
  grit: 'resilience',
  determination: 'resilience',
  endurance: 'resilience',
  mamba: 'resilience',
  courage: 'courage',
  principle: 'courage',
  truth: 'courage',
  nonviolence: 'courage',
  justice: 'courage',
  barrier: 'adversity',
  transformation: 'adversity',
  resistance: 'adversity',
  dignity: 'adversity',
  defector: 'adversity',
  precision: 'discipline',
  perfection: 'discipline',
  patience: 'discipline',
  focus: 'discipline',
  discipline: 'discipline',
  excellence: 'discipline',
  speed: 'discipline',
}

interface RawBio {
  name: string
  domain: string
  summary: string
  traits: [number, number, number, number, number]
  tags: string[]
  birthYear: number
  nationality: string
  fameTier: 1 | 2 | 3
  peakLifeStage: string
}

const RAW_BIOS: RawBio[] = [
  // ===== SCIENCE =====
  { name: 'Marie Curie', domain: 'science', summary: 'Pioneer of radioactivity and the first person to win Nobel Prizes in two sciences.', traits: [85, 90, 55, 70, 30], tags: ['perseverance', 'research', 'breakthrough'], birthYear: 1867, nationality: 'Polish-French', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Albert Einstein', domain: 'science', summary: 'Theoretical physicist who developed the theory of relativity and revolutionized physics.', traits: [95, 70, 45, 65, 35], tags: ['creativity', 'theory', 'curiosity'], birthYear: 1879, nationality: 'German-Swiss-American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Neil deGrasse Tyson', domain: 'science', summary: 'Astrophysicist and science communicator who makes complex topics accessible to the public.', traits: [90, 75, 85, 70, 30], tags: ['communication', 'education', 'wonder'], birthYear: 1958, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Rosalind Franklin', domain: 'science', summary: 'Chemist whose X-ray diffraction images were critical to discovering the structure of DNA.', traits: [80, 95, 40, 60, 50], tags: ['precision', 'resilience', 'contribution'], birthYear: 1920, nationality: 'British', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Katherine Johnson', domain: 'science', summary: 'NASA mathematician whose orbital calculations were critical to early space missions.', traits: [75, 95, 50, 75, 35], tags: ['calculation', 'perseverance', 'space'], birthYear: 1918, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Stephen Hawking', domain: 'science', summary: 'Cosmologist who made groundbreaking contributions to understanding black holes and the universe.', traits: [90, 85, 50, 65, 45], tags: ['theoretical', 'resilience', 'cosmos'], birthYear: 1942, nationality: 'British', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Ada Lovelace', domain: 'science', summary: 'Mathematician regarded as the first computer programmer for her work on the Analytical Engine.', traits: [90, 85, 55, 60, 40], tags: ['vision', 'algorithms', 'innovation'], birthYear: 1815, nationality: 'British', fameTier: 2, peakLifeStage: 'early' },
  { name: 'Grace Hopper', domain: 'science', summary: 'Computer scientist who created the first compiler and helped develop early programming languages.', traits: [85, 90, 70, 65, 30], tags: ['innovation', 'persistence', 'code'], birthYear: 1906, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Jane Goodall', domain: 'science', summary: 'Primatologist whose revolutionary chimpanzee research changed our understanding of animals.', traits: [85, 90, 65, 85, 35], tags: ['observation', 'compassion', 'conservation'], birthYear: 1934, nationality: 'British', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Nikola Tesla', domain: 'science', summary: 'Inventor and electrical engineer whose AC motor and wireless technologies shaped modern life.', traits: [90, 85, 50, 55, 65], tags: ['invention', 'vision', 'precision'], birthYear: 1856, nationality: 'Serbian-American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Pierre Curie', domain: 'science', summary: 'Physicist who co-discovered radioactivity and supported the research that won his wife a Nobel Prize.', traits: [80, 85, 55, 75, 35], tags: ['collaboration', 'research', 'support'], birthYear: 1859, nationality: 'French', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Alan Turing', domain: 'science', summary: 'Mathematician and computer scientist who broke the Enigma code and pioneered ideas behind AI.', traits: [90, 90, 50, 60, 55], tags: ['code', 'logic', 'legacy'], birthYear: 1912, nationality: 'British', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Kip Thorne', domain: 'science', summary: 'Nobel Prize physicist who advanced gravitational wave detection and theoretical cosmology.', traits: [85, 85, 60, 70, 40], tags: ['gravity', 'theory', 'collaboration'], birthYear: 1940, nationality: 'American', fameTier: 1, peakLifeStage: 'mid' },
  { name: 'Temple Grandin', domain: 'science', summary: 'Animal scientist and autism advocate who revolutionised livestock handling systems.', traits: [85, 90, 55, 70, 45], tags: ['innovation', 'advocacy', 'observation'], birthYear: 1947, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Sally Ride', domain: 'science', summary: 'First American woman in space and a physicist who inspired generations of scientists.', traits: [85, 85, 70, 75, 35], tags: ['space', 'inspiration', 'education'], birthYear: 1951, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Demis Hassabis', domain: 'science', summary: 'AI researcher and co-founder of DeepMind, whose AlphaGo defeated world champions at Go.', traits: [90, 90, 70, 70, 40], tags: ['ai', 'strategy', 'innovation'], birthYear: 1976, nationality: 'British', fameTier: 2, peakLifeStage: 'mid' },

  // ===== POLITICS =====
  { name: 'Abraham Lincoln', domain: 'politics', summary: '16th U.S. President who preserved the Union during the Civil War and abolished slavery.', traits: [70, 90, 60, 85, 40], tags: ['leadership', 'empathy', 'union'], birthYear: 1809, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Nelson Mandela', domain: 'politics', summary: 'Anti-apartheid revolutionary and the first Black president of South Africa, who led reconciliation.', traits: [75, 85, 65, 90, 30], tags: ['forgiveness', 'resilience', 'justice'], birthYear: 1918, nationality: 'South African', fameTier: 3, peakLifeStage: 'late' },
  { name: 'Winston Churchill', domain: 'politics', summary: 'British Prime Minister who led Britain through World War II with powerful oratory.', traits: [70, 90, 80, 55, 45], tags: ['courage', 'oratory', 'resilience'], birthYear: 1874, nationality: 'British', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Angela Merkel', domain: 'politics', summary: 'First female chancellor of Germany, known for pragmatic, science-based leadership.', traits: [70, 95, 50, 70, 35], tags: ['pragmatism', 'stability', 'science'], birthYear: 1954, nationality: 'German', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Jacinda Ardern', domain: 'politics', summary: 'Prime Minister of New Zealand known for empathetic, decisive crisis leadership.', traits: [75, 85, 70, 90, 35], tags: ['empathy', 'compassion', 'crisis'], birthYear: 1980, nationality: 'New Zealander', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Malala Yousafzai', domain: 'politics', summary: 'Activist for girls education and the youngest Nobel Prize laureate.', traits: [80, 85, 75, 85, 40], tags: ['courage', 'education', 'advocacy'], birthYear: 1997, nationality: 'Pakistani', fameTier: 3, peakLifeStage: 'early' },
  { name: 'Barack Obama', domain: 'politics', summary: '44th U.S. President and the first African American to hold the office, known for hope and coalition building.', traits: [80, 85, 80, 75, 35], tags: ['hope', 'eloquence', 'unity'], birthYear: 1961, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Golda Meir', domain: 'politics', summary: 'First female prime minister of Israel, who led the country through the Yom Kippur War.', traits: [70, 90, 70, 65, 50], tags: ['resilience', 'leadership', 'determination'], birthYear: 1898, nationality: 'Israeli', fameTier: 2, peakLifeStage: 'mid' },

  // ===== ARTS =====
  { name: 'Frida Kahlo', domain: 'arts', summary: 'Mexican painter known for vivid self-portraits exploring identity, pain, and Mexican culture.', traits: [95, 75, 55, 65, 80], tags: ['expression', 'resilience', 'identity'], birthYear: 1907, nationality: 'Mexican', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Leonardo da Vinci', domain: 'arts', summary: 'Renaissance polymath: painter, scientist, inventor, and engineer who created the Mona Lisa.', traits: [95, 85, 50, 65, 35], tags: ['polymath', 'creativity', 'observation'], birthYear: 1452, nationality: 'Italian', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Toni Morrison', domain: 'arts', summary: 'Nobel Prize-winning novelist exploring Black American identity and experience.', traits: [90, 85, 50, 80, 55], tags: ['narrative', 'identity', 'voice'], birthYear: 1931, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Vincent van Gogh', domain: 'arts', summary: 'Post-Impressionist painter whose emotionally charged works transformed modern art.', traits: [95, 65, 45, 55, 85], tags: ['expression', 'passion', 'color'], birthYear: 1853, nationality: 'Dutch', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Maya Angelou', domain: 'arts', summary: 'Poet, memoirist, and civil rights activist whose work celebrates resilience and identity.', traits: [85, 85, 75, 85, 45], tags: ['voice', 'resilience', 'poetry'], birthYear: 1928, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Ludwig van Beethoven', domain: 'arts', summary: 'Composer who bridged the Classical and Romantic eras while losing his hearing.', traits: [90, 90, 55, 60, 60], tags: ['discipline', 'passion', 'symphony'], birthYear: 1770, nationality: 'German', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Andy Warhol', domain: 'arts', summary: 'Pop art pioneer who transformed consumer culture and celebrity into high art.', traits: [85, 70, 70, 55, 40], tags: ['pop', 'innovation', 'culture'], birthYear: 1928, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'David Bowie', domain: 'arts', summary: 'Musician and icon who reinvented himself across decades, blending art, fashion, and sound.', traits: [95, 75, 80, 65, 55], tags: ['transformation', 'glam', 'innovation'], birthYear: 1947, nationality: 'British', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Rita Dove', domain: 'arts', summary: 'Poet laureate whose work explores history, race, and the human condition with lyrical power.', traits: [85, 85, 60, 80, 45], tags: ['lyric', 'history', 'voice'], birthYear: 1952, nationality: 'American', fameTier: 1, peakLifeStage: 'mid' },

  // ===== BUSINESS =====
  { name: 'Elon Musk', domain: 'business', summary: 'Entrepreneur leading electric vehicles, space exploration, and sustainable energy ventures.', traits: [90, 80, 85, 50, 55], tags: ['innovation', 'risk', 'vision'], birthYear: 1971, nationality: 'South African-Canadian', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Sara Blakely', domain: 'business', summary: 'Self-made billionaire who founded Spanx, starting the company with $5,000 in savings.', traits: [80, 85, 80, 70, 35], tags: ['entrepreneurship', 'persistence', 'product'], birthYear: 1971, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Warren Buffett', domain: 'business', summary: 'Investor known for value investing philosophy and a long-term, disciplined approach to markets.', traits: [70, 95, 55, 70, 35], tags: ['patience', 'discipline', 'value'], birthYear: 1930, nationality: 'American', fameTier: 3, peakLifeStage: 'late' },
  { name: 'Sheryl Sandberg', domain: 'business', summary: 'Former COO of Meta and author who advocated for women in the workplace.', traits: [75, 90, 80, 80, 45], tags: ['leadership', 'advocacy', 'strategy'], birthYear: 1969, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Steve Jobs', domain: 'business', summary: 'Co-founder of Apple, known for design vision, innovation, and a relentless pursuit of excellence.', traits: [90, 85, 80, 55, 50], tags: ['vision', 'design', 'perfection'], birthYear: 1955, nationality: 'American', fameTier: 3, peakLifeStage: 'early' },
  { name: 'Muhammad Yunus', domain: 'business', summary: 'Nobel Peace Prize winner who founded Grameen Bank and pioneered microfinance for the poor.', traits: [75, 85, 70, 90, 30], tags: ['social', 'innovation', 'compassion'], birthYear: 1940, nationality: 'Bangladeshi', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Indra Nooyi', domain: 'business', summary: 'Former PepsiCo CEO who transformed the company toward healthier products and sustainable growth.', traits: [80, 95, 80, 75, 40], tags: ['strategy', 'transformation', 'leadership'], birthYear: 1955, nationality: 'Indian-American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Howard Schultz', domain: 'business', summary: 'Former Starbucks CEO who built the company into a global brand and prioritised employee welfare.', traits: [75, 85, 80, 80, 40], tags: ['culture', 'brand', 'values'], birthYear: 1953, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Gordon Moore', domain: 'business', summary: 'Intel co-founder whose observation predicted the exponential growth of computing power.', traits: [80, 90, 60, 65, 35], tags: ['prediction', 'semiconductor', 'vision'], birthYear: 1929, nationality: 'American', fameTier: 1, peakLifeStage: 'mid' },
  { name: 'Shantanu Narayen', domain: 'business', summary: 'CEO of Adobe, leading the transformation to cloud-based creative software.', traits: [80, 90, 75, 75, 35], tags: ['transformation', 'strategy', 'innovation'], birthYear: 1963, nationality: 'Indian-American', fameTier: 1, peakLifeStage: 'mid' },
  { name: 'Arianna Huffington', domain: 'business', summary: 'Media entrepreneur and advocate for wellness and sleep who founded The Huffington Post.', traits: [75, 85, 80, 75, 45], tags: ['media', 'wellness', 'resilience'], birthYear: 1950, nationality: 'Greek-American', fameTier: 1, peakLifeStage: 'mid' },

  // ===== SPORT =====
  { name: 'Serena Williams', domain: 'sport', summary: 'One of the greatest tennis players of all time, with 23 Grand Slam singles titles.', traits: [70, 95, 80, 65, 40], tags: ['determination', 'power', 'resilience'], birthYear: 1981, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Michael Jordan', domain: 'sport', summary: 'Six-time NBA champion known for a relentless work ethic and clutch performances.', traits: [75, 95, 80, 65, 45], tags: ['competition', 'grit', 'excellence'], birthYear: 1963, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Simone Biles', domain: 'sport', summary: 'The most decorated American gymnast in history, with unmatched skill difficulty.', traits: [80, 95, 75, 70, 40], tags: ['power', 'precision', 'courage'], birthYear: 1997, nationality: 'American', fameTier: 3, peakLifeStage: 'early' },
  { name: 'Kobe Bryant', domain: 'sport', summary: 'Five-time NBA champion known for the Mamba Mentality and an obsessive work ethic.', traits: [75, 95, 75, 60, 50], tags: ['grit', 'competition', 'mamba'], birthYear: 1978, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Mia Hamm', domain: 'sport', summary: 'Two-time Olympic gold medalist in soccer and one of the greatest female athletes.', traits: [75, 90, 80, 75, 40], tags: ['teamwork', 'speed', 'determination'], birthYear: 1972, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Usain Bolt', domain: 'sport', summary: 'Jamaican sprinter and the fastest man in history, with multiple Olympic gold medals.', traits: [70, 85, 85, 70, 35], tags: ['speed', 'joy', 'excellence'], birthYear: 1986, nationality: 'Jamaican', fameTier: 3, peakLifeStage: 'early' },
  { name: 'Misty Copeland', domain: 'sport', summary: 'First African American female principal dancer at American Ballet Theatre, breaking barriers.', traits: [80, 95, 75, 75, 45], tags: ['grace', 'barrier', 'determination'], birthYear: 1982, nationality: 'American', fameTier: 2, peakLifeStage: 'early' },
  { name: 'Muhammad Ali', domain: 'sport', summary: 'Boxing legend and civil rights activist known for speed, principle, and humanitarian work.', traits: [80, 85, 80, 75, 40], tags: ['principle', 'speed', 'humanitarian'], birthYear: 1942, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Bjorn Borg', domain: 'sport', summary: 'Swedish tennis champion who dominated Wimbledon in the 1970s with relentless baseline play.', traits: [70, 90, 70, 60, 40], tags: ['endurance', 'discipline', 'focus'], birthYear: 1956, nationality: 'Swedish', fameTier: 1, peakLifeStage: 'mid' },
  { name: 'Marta Vieira da Silva', domain: 'sport', summary: 'Brazilian soccer legend, widely considered the greatest female player in history.', traits: [75, 90, 80, 75, 35], tags: ['skill', 'teamwork', 'passion'], birthYear: 1986, nationality: 'Brazilian', fameTier: 2, peakLifeStage: 'early' },
  { name: 'Gabrielle Reece', domain: 'sport', summary: 'Volleyball star and fitness personality known for athleticism and resilience across sports.', traits: [75, 85, 75, 65, 40], tags: ['athleticism', 'fitness', 'strength'], birthYear: 1970, nationality: 'American', fameTier: 1, peakLifeStage: 'mid' },

  // ===== ACTIVISM =====
  { name: 'Malcolm X', domain: 'activism', summary: 'Human rights activist and an influential voice in the Black Power and civil rights movements.', traits: [75, 85, 80, 60, 50], tags: ['justice', 'voice', 'transformation'], birthYear: 1925, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Greta Thunberg', domain: 'activism', summary: 'Climate activist who started the global Fridays for Future school strike movement.', traits: [80, 90, 70, 75, 50], tags: ['climate', 'courage', 'persistence'], birthYear: 2003, nationality: 'Swedish', fameTier: 3, peakLifeStage: 'early' },
  { name: 'Rosa Parks', domain: 'activism', summary: 'Civil rights icon whose refusal to give up her bus seat sparked the Montgomery Bus Boycott.', traits: [70, 90, 50, 85, 35], tags: ['courage', 'justice', 'dignity'], birthYear: 1913, nationality: 'American', fameTier: 3, peakLifeStage: 'mid' },
  { name: 'Desmond Tutu', domain: 'activism', summary: 'South African Archbishop and anti-apartheid activist who chaired the Truth and Reconciliation Commission.', traits: [75, 80, 65, 90, 30], tags: ['forgiveness', 'justice', 'spirituality'], birthYear: 1931, nationality: 'South African', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Vaclav Havel', domain: 'activism', summary: 'Czech playwright and dissident who became president after leading the Velvet Revolution.', traits: [85, 80, 65, 80, 35], tags: ['truth', 'resistance', 'culture'], birthYear: 1936, nationality: 'Czech', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Rachel Carson', domain: 'activism', summary: 'Marine biologist and writer whose book Silent Spring sparked the modern environmental movement.', traits: [85, 90, 55, 80, 40], tags: ['environment', 'truth', 'awareness'], birthYear: 1907, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Cesar Chavez', domain: 'activism', summary: 'Labor leader and civil rights activist who organised farmworkers through nonviolent action.', traits: [70, 90, 65, 90, 35], tags: ['justice', 'nonviolence', 'community'], birthYear: 1927, nationality: 'American', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Wangari Maathai', domain: 'activism', summary: 'Nobel Peace Prize winner who founded the Green Belt Movement for environmental and women rights.', traits: [80, 90, 70, 85, 35], tags: ['environment', 'empowerment', 'community'], birthYear: 1940, nationality: 'Kenyan', fameTier: 2, peakLifeStage: 'mid' },
  { name: 'Ai Weiwei', domain: 'activism', summary: 'Chinese artist and dissident whose work challenges authority and social norms.', traits: [90, 75, 65, 70, 55], tags: ['expression', 'courage', 'culture'], birthYear: 1957, nationality: 'Chinese', fameTier: 2, peakLifeStage: 'mid' },
]

function matchKeywords(text: string, tags: string[], keywordMap: Record<string, string[]>): string[] {
  const haystack = `${text} ${tags.join(' ')}`.toLowerCase()
  const hits: string[] = []
  for (const [theme, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((kw) => haystack.includes(kw))) hits.push(theme)
  }
  return hits
}

function deriveChallenges(bio: RawBio): string[] {
  const fromKeywords = matchKeywords(bio.summary, bio.tags, CHALLENGE_KEYWORDS)
  const fromTags = bio.tags
    .map((tag) => CHALLENGE_TAG_MAP[tag])
    .filter((c): c is string => Boolean(c))
  return Array.from(new Set([...fromKeywords, ...fromTags]))
}

export function wikipediaUrl(name: string): string {
  return `https://en.wikipedia.org/wiki/${name.replace(/ /g, '_')}`
}

export const BIOGRAPHIES: Biography[] = RAW_BIOS.map((raw, index) => {
  const traits: TraitScore = {
    O: raw.traits[0],
    C: raw.traits[1],
    E: raw.traits[2],
    A: raw.traits[3],
    N: raw.traits[4],
  }
  return {
    id: index + 1,
    name: raw.name,
    domain: raw.domain,
    summary: raw.summary,
    traits,
    traitSource: 'estimated',
    traitConfidence: 0.8,
    themes: matchKeywords(raw.summary, raw.tags, THEME_KEYWORDS),
    challenges: deriveChallenges(raw),
    birthYear: raw.birthYear,
    deathYear: null,
    nationality: raw.nationality,
    fameTier: raw.fameTier,
    peakLifeStage: raw.peakLifeStage,
    sourceUrl: wikipediaUrl(raw.name),
  }
})

export function themeLabel(id: string): string {
  return THEMES.find((t) => t.id === id)?.label ?? id
}

export function challengeLabel(id: string): string {
  return CHALLENGE_LABELS[id] ?? id
}

export function eraFromLifeStage(lifeStage: string): string {
  if (lifeStage === '18-24' || lifeStage === '25-34') return 'early'
  if (lifeStage === '55+') return 'late'
  return 'mid'
}
