import type { Subject } from './dayState';

// The question banks: three subjects at roughly grade 4–5, about a quarter
// light joke questions in the same shape. Shuffled per day; a class draws
// without repeats. Authored here, no loading.

export interface Question {
  prompt: string;
  options: [string, string, string, string];
  /** Index of the correct option. */
  answer: 0 | 1 | 2 | 3;
  joke?: boolean;
}

const q = (
  prompt: string,
  options: [string, string, string, string],
  answer: 0 | 1 | 2 | 3,
  joke = false,
): Question => (joke ? { prompt, options, answer, joke } : { prompt, options, answer });

const MATH: Question[] = [
  q('What is 7 × 8?', ['54', '56', '58', '64'], 1),
  q('What is 144 ÷ 12?', ['10', '11', '12', '14'], 2),
  q('Which fraction is the same as 0.5?', ['1/3', '1/2', '2/3', '3/4'], 1),
  q('What is 3/4 + 1/4?', ['1/2', '3/8', '1', '4/8'], 2),
  q('How many sides does a hexagon have?', ['5', '6', '7', '8'], 1),
  q('What is 9 squared?', ['18', '72', '81', '99'], 2),
  q('What is 1000 − 387?', ['613', '623', '713', '723'], 0),
  q('Which number is prime?', ['21', '27', '29', '33'], 2),
  q('How many degrees are in a right angle?', ['45', '60', '90', '180'], 2),
  q('What is 6 × 7 − 2?', ['40', '42', '44', '38'], 0),
  q('What is the perimeter of a square with 5 cm sides?', ['10 cm', '15 cm', '20 cm', '25 cm'], 2),
  q('What is the area of a 4 × 6 rectangle?', ['10', '20', '24', '48'], 2),
  q('Round 4,678 to the nearest hundred.', ['4,600', '4,700', '4,680', '5,000'], 1),
  q('What is 25% of 80?', ['15', '20', '25', '40'], 1),
  q('Which is the largest?', ['0.7', '0.65', '0.09', '0.099'], 0),
  q('What is 12 × 12?', ['124', '132', '144', '148'], 2),
  q('How many minutes are in 2.5 hours?', ['120', '130', '150', '250'], 2),
  q('What comes next: 3, 6, 12, 24, …?', ['30', '36', '48', '72'], 2),
  q('What is 5/10 simplified?', ['1/5', '1/2', '2/5', '5/1'], 1),
  q('How many millimetres are in a metre?', ['10', '100', '1,000', '10,000'], 2),
  q('What is 15 × 4?', ['45', '50', '60', '64'], 2),
  q('What is the value of the 7 in 4,706?', ['7', '70', '700', '7,000'], 2),
  q('A triangle has angles of 60° and 60°. What is the third?', ['30°', '60°', '90°', '120°'], 1),
  q('What is 8 × 0?', ['0', '8', '80', '1'], 0),
  q('Which shape has no corners?', ['Square', 'Triangle', 'Circle', 'Rectangle'], 2),
  q('What is 1/3 of 27?', ['3', '6', '9', '13'], 2),
  q('How many faces does a cube have?', ['4', '6', '8', '12'], 1),
  q('What is 100 − 45 − 15?', ['30', '40', '50', '60'], 1),
  q('Which is an even number?', ['131', '245', '318', '507'], 2),
  q('What is 2 to the power of 5?', ['10', '25', '32', '64'], 2),
  q(
    'How many bananas does a gorilla need for 3 breakfasts if it eats 4 each?',
    ['7', '12', '34', 'All of them'],
    1,
    true,
  ),
  q(
    'If a bus leaves at 8:05 and the ride is 25 minutes, when does it arrive?',
    ['8:20', '8:25', '8:30', '8:35'],
    2,
  ),
  q('What is the shape of a stop sign?', ['Hexagon', 'Octagon', 'Pentagon', 'Circle'], 1),
  q(
    'A gorilla climbs 3 m up a drainpipe and slides 1 m back, six times. How high is it?',
    ['6 m', '12 m', '18 m', 'Still on the ground'],
    1,
    true,
  ),
  q('How many zeros are in one million?', ['4', '5', '6', '7'], 2),
  q('What is half of 350?', ['125', '150', '175', '225'], 2),
  q(
    'Which is heavier: 1 kg of feathers or 1 kg of bricks?',
    ['Feathers', 'Bricks', 'The same', 'Depends on the gorilla'],
    2,
    true,
  ),
  q(
    'If you knuckle-walk 2 m per stride and take 50 strides, how far did you go?',
    ['25 m', '52 m', '100 m', 'To school'],
    2,
    true,
  ),
  q('What is 45 + 38?', ['73', '82', '83', '93'], 2),
  q('How many grams are in 3 kg?', ['30', '300', '3,000', '30,000'], 2),
  q(
    'Two gorillas share 9 bananas equally and one is left over. How many each?',
    ['3', '4', '4.5', 'They fight over it'],
    1,
    true,
  ),
  q('What is 7 × 11?', ['66', '71', '77', '88'], 2),
  q(
    'A classroom has 12 desks and one gorilla on the bookshelf. How many are sitting properly?',
    ['12', '11', '0', 'Define properly'],
    2,
    true,
  ),
  q(
    'The bus holds 30 kids or 1 gorilla. What is 30 ÷ 1?',
    ['1', '30', '31', 'Not enough bus'],
    1,
    true,
  ),
  q(
    'If you leap 4 m and the gap is 3 m, how much spare do you have?',
    ['0 m', '1 m', '7 m', 'Never enough'],
    1,
    true,
  ),
  q(
    'How many hands does a gorilla have free while carrying a barrel?',
    ['0', '1', '2', 'It depends who is asking'],
    1,
    true,
  ),
  q(
    'If gym class has 3 hoops shots to make and you made 2, how many left?',
    ['1', '2', '3', 'One more, then celebrate'],
    0,
    true,
  ),
];

const SCIENCE: Question[] = [
  q(
    'What gas do plants take in from the air?',
    ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'],
    1,
  ),
  q('Which planet is closest to the Sun?', ['Venus', 'Earth', 'Mercury', 'Mars'], 2),
  q(
    'What is water made of?',
    ['Hydrogen and oxygen', 'Carbon and oxygen', 'Salt and air', 'Ice and steam'],
    0,
  ),
  q(
    'What force pulls things toward the ground?',
    ['Magnetism', 'Friction', 'Gravity', 'Electricity'],
    2,
  ),
  q('Which of these is a mammal?', ['Frog', 'Shark', 'Gorilla', 'Eagle'], 2),
  q('How many legs does an insect have?', ['4', '6', '8', '10'], 1),
  q(
    'What do we call animals that eat only plants?',
    ['Carnivores', 'Herbivores', 'Omnivores', 'Predators'],
    1,
  ),
  q('Which organ pumps blood around the body?', ['Lungs', 'Brain', 'Heart', 'Stomach'], 2),
  q('What is the boiling point of water at sea level?', ['50 °C', '90 °C', '100 °C', '212 °C'], 2),
  q('Which state of matter is steam?', ['Solid', 'Liquid', 'Gas', 'Plasma'], 2),
  q('What do bees collect from flowers?', ['Sap', 'Nectar', 'Water', 'Seeds'], 1),
  q(
    'What makes the Moon shine?',
    ['Its own fire', 'Reflected sunlight', 'Electricity', 'Stars behind it'],
    1,
  ),
  q('Which is the largest planet?', ['Saturn', 'Neptune', 'Jupiter', 'Earth'], 2),
  q('What are clouds made of?', ['Smoke', 'Cotton', 'Tiny water droplets', 'Dust'], 2),
  q('Which sense do we use our ears for?', ['Sight', 'Smell', 'Hearing', 'Taste'], 2),
  q('What do you call a baby frog?', ['Kitten', 'Tadpole', 'Cub', 'Chick'], 1),
  q('How many bones are in an adult human body, roughly?', ['106', '206', '306', '406'], 1),
  q('Which is a renewable energy source?', ['Coal', 'Oil', 'Wind', 'Gas'], 2),
  q('What part of a plant makes seeds?', ['Root', 'Leaf', 'Flower', 'Stem'], 2),
  q('Sound travels fastest through…', ['Air', 'Water', 'Steel', 'Space'], 2),
  q('What is the hardest natural material?', ['Gold', 'Iron', 'Diamond', 'Granite'], 2),
  q('Which animal is a reptile?', ['Salamander', 'Crocodile', 'Dolphin', 'Penguin'], 1),
  q('What does a thermometer measure?', ['Weight', 'Temperature', 'Speed', 'Light'], 1),
  q('What do we breathe out?', ['Oxygen', 'Carbon dioxide', 'Helium', 'Hydrogen'], 1),
  q('Which of these is a simple machine?', ['A lever', 'A computer', 'A bicycle', 'A clock'], 0),
  q('What causes day and night?', ['The Sun moving', 'Earth spinning', 'Clouds', 'The Moon'], 1),
  q('Which is the coldest?', ['Ice', 'Snow', 'Liquid nitrogen', 'A fridge'], 2),
  q(
    'What do you call an animal that is active at night?',
    ['Nocturnal', 'Diurnal', 'Aquatic', 'Arboreal'],
    0,
  ),
  q('Magnets attract which metal?', ['Copper', 'Aluminium', 'Iron', 'Gold'], 2),
  q('How many planets are in our solar system?', ['7', '8', '9', '12'], 1),
  q(
    'Why does a gorilla slide when it hits a wall at speed?',
    ['Bad manners', 'Momentum', 'The wall is slippery', 'Gravity turned off'],
    1,
    true,
  ),
  q(
    'Which way does a dropped basketball go?',
    ['Up', 'Down', 'Sideways', 'It waits for instructions'],
    1,
    true,
  ),
  q('What is a gorilla mostly made of?', ['Bananas', 'Fur', 'Water', 'Attitude'], 2, true),
  q('Which animal has the biggest brain?', ['Ant', 'Sperm whale', 'Gorilla', 'Goldfish'], 1),
  q(
    'A wind at your ears while running means…',
    ['You are fast', 'You are slow', 'It is raining', 'School is closed'],
    0,
    true,
  ),
  q('Which of these floats on water?', ['A rock', 'A coin', 'A cork', 'A key'], 2),
  q(
    'What do we call the study of living things?',
    ['Geology', 'Biology', 'Astronomy', 'Chemistry'],
    1,
  ),
  q('Which is closest to Earth?', ['The Sun', 'The Moon', 'Mars', 'Jupiter'], 1),
  q(
    'What protects a gorilla from a hard landing?',
    ['Bending its arms', 'Shouting', 'A helmet', 'Closing its eyes'],
    0,
    true,
  ),
  q(
    'Where do gorillas live in the wild?',
    ['Antarctica', 'Central Africa', 'Australia', 'The Arctic'],
    1,
  ),
  q('Which of these is a liquid at room temperature?', ['Iron', 'Oxygen', 'Milk', 'Wood'], 2),
  q(
    'Why do your hands stick to the wall when you climb?',
    ['Glue', 'Friction and grip', 'Magic', 'Politeness'],
    1,
    true,
  ),
  q(
    'What happens to a thrown basketball?',
    ['It arcs and falls', 'It floats away', 'It stops mid-air', 'It asks for a pass'],
    0,
    true,
  ),
  q(
    'Why is the school gym so echoey?',
    ['Hard walls bounce sound', 'Ghosts', 'Too many hoops', 'The floor is hollow'],
    0,
    true,
  ),
  q(
    'What does a gorilla need to stop sliding on a roof?',
    ['Grip', 'Wings', 'A ladder', 'Less breakfast'],
    0,
    true,
  ),
  q(
    'Which of these can a gorilla NOT climb?',
    ['A drainpipe', 'A tree', 'A cloud', 'A fence'],
    2,
    true,
  ),
];

const HISTORY: Question[] = [
  q(
    'Who invented the light bulb?',
    ['Isaac Newton', 'Thomas Edison', 'Albert Einstein', 'Marie Curie'],
    1,
  ),
  q('The pyramids of Giza are in which country?', ['Greece', 'Egypt', 'Mexico', 'India'], 1),
  q('Which ancient people built the Colosseum?', ['Greeks', 'Romans', 'Vikings', 'Aztecs'], 1),
  q(
    'What did people use before electric lights?',
    ['Candles and oil lamps', 'Phone torches', 'Glow sticks', 'Fireflies in jars'],
    0,
  ),
  q(
    'Who was the first person to walk on the Moon?',
    ['Yuri Gagarin', 'Buzz Aldrin', 'Neil Armstrong', 'Sally Ride'],
    2,
  ),
  q('The Great Wall is in which country?', ['Japan', 'China', 'Mongolia', 'Korea'], 1),
  q(
    'Which invention lets us talk to someone far away?',
    ['Telephone', 'Kettle', 'Compass', 'Umbrella'],
    0,
  ),
  q('Knights lived in which period?', ['Stone Age', 'Middle Ages', 'Space Age', 'Bronze Age'], 1),
  q(
    'What did the Wright brothers invent?',
    ['The car', 'The aeroplane', 'The train', 'The bicycle'],
    1,
  ),
  q('Vikings came from…', ['Spain', 'Scandinavia', 'Egypt', 'Brazil'], 1),
  q(
    'What was used to write on before paper?',
    ['Plastic', 'Papyrus and clay', 'Glass', 'Metal foil'],
    1,
  ),
  q('Which came first?', ['The car', 'The horse-drawn cart', 'The aeroplane', 'The rocket'], 1),
  q('Who painted the Mona Lisa?', ['Picasso', 'Leonardo da Vinci', 'Van Gogh', 'Michelangelo'], 1),
  q('What did early humans use to make tools?', ['Plastic', 'Stone', 'Steel', 'Rubber'], 1),
  q('Which sailor is famous for a 1492 voyage?', ['Magellan', 'Columbus', 'Cook', 'Drake'], 1),
  q('Castles were built mainly for…', ['Swimming', 'Defence', 'Shopping', 'Farming'], 1),
  q('What powered the first trains?', ['Electricity', 'Steam', 'Petrol', 'Wind'], 1),
  q('The Olympic Games began in…', ['Rome', 'Ancient Greece', 'Egypt', 'Persia'], 1),
  q(
    'Dinosaurs lived…',
    ['100 years ago', '1,000 years ago', 'Millions of years ago', 'Last summer'],
    2,
  ),
  q(
    'Which machine printed the first books quickly?',
    ['Typewriter', 'Printing press', 'Photocopier', 'Laptop'],
    1,
  ),
  q('Who was Cleopatra?', ['A Roman general', 'A queen of Egypt', 'A Greek poet', 'A Viking'], 1),
  q(
    'Before fridges, how did people keep food cold?',
    ['Ice houses and cellars', 'Fans', 'Wishing', 'Sunlight'],
    0,
  ),
  q('The Titanic was a…', ['Train', 'Ship', 'Plane', 'Castle'], 1),
  q('Which of these is the oldest?', ['The internet', 'Television', 'Radio', 'The wheel'], 3),
  q('Who wrote plays like Romeo and Juliet?', ['Dickens', 'Shakespeare', 'Tolkien', 'Rowling'], 1),
  q('Hieroglyphs were writing from…', ['Rome', 'Egypt', 'China', 'Greece'], 1),
  q(
    'What did people ride before cars?',
    ['Horses', 'Bicycles only', 'Skateboards', 'Elephants'],
    0,
  ),
  q('The first computers were…', ['Pocket sized', 'Room sized', 'Invisible', 'Made of wood'], 1),
  q(
    'Which explorer reached the South Pole first?',
    ['Scott', 'Amundsen', 'Shackleton', 'Hillary'],
    1,
  ),
  q('Samurai were warriors from…', ['China', 'Japan', 'India', 'Mongolia'], 1),
  q(
    'When did gorillas first go to school?',
    ['1066', '1969', 'This morning', 'They never stopped'],
    2,
    true,
  ),
  q(
    'What did the first school bus look like?',
    ['A rocket', 'A horse-drawn wagon', 'A submarine', 'A very long skateboard'],
    1,
  ),
  q(
    'Who built the first rooftop route across a town?',
    ['The Romans', 'The Vikings', 'A gorilla, this week', 'Nobody, roofs are for rain'],
    2,
    true,
  ),
  q('Ancient Romans spoke…', ['Latin', 'English', 'French', 'Spanish'], 0),
  q(
    'The Stone Age is named after…',
    ['A famous stone', 'Stone tools', 'A band', 'Stone houses'],
    1,
  ),
  q(
    'What was a medieval town crier?',
    ['A sad person', 'The news announcer', 'A baker', 'A knight'],
    1,
  ),
  q(
    'Which was invented most recently?',
    ['The wheel', 'The telephone', 'The smartphone', 'The printing press'],
    2,
  ),
  q(
    'The oldest way to send a message far away was…',
    ['Email', 'A runner on foot', 'Text message', 'Pigeon post'],
    1,
  ),
  q(
    'What did the alarm clock replace?',
    ['The rooster', 'The moon', 'Breakfast', 'The bus'],
    0,
    true,
  ),
  q(
    'Which building in this town is the oldest?',
    ['The office', 'The cabin in the woods', 'The gym', 'The bus stop'],
    1,
    true,
  ),
  q(
    'Who first figured out that Earth goes around the Sun?',
    ['Copernicus', 'Edison', 'Columbus', 'Caesar'],
    0,
  ),
  q(
    'How did students get to school before buses?',
    ['They walked', 'They teleported', 'School came to them', 'On rooftops'],
    0,
    true,
  ),
  q(
    'What did knights wear that gorillas do not?',
    ['Armour', 'Fur', 'Big arms', 'Frowns'],
    0,
    true,
  ),
  q(
    'Who painted cave walls thousands of years ago?',
    ['Early humans', 'Cave gorillas', 'Robots', 'Nobody, it was rain'],
    0,
    true,
  ),
  q(
    'What was the first thing ever built for climbing?',
    ['A ladder', 'A tree, by nature', 'A drainpipe', 'A bus shelter'],
    1,
    true,
  ),
  q(
    'Which of these was NOT a real job in the Middle Ages?',
    ['Blacksmith', 'Miller', 'App developer', 'Farmer'],
    2,
    true,
  ),
];

export const BANKS: Record<Subject, Question[]> = {
  math: MATH,
  science: SCIENCE,
  history: HISTORY,
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle of a bank for a day seed. */
export function shuffleBank(subject: Subject, seed: number): Question[] {
  const out = [...BANKS[subject]];
  const rnd = mulberry32(seed * 7919 + subject.length);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Draws without repeats until the bank is exhausted, then reshuffles. */
export class QuestionDeck {
  private order: Question[];
  private index = 0;
  private pass = 0;

  constructor(
    readonly subject: Subject,
    private readonly seed: number,
  ) {
    this.order = shuffleBank(subject, seed);
  }

  next(): Question {
    if (this.index >= this.order.length) {
      this.pass += 1;
      this.order = shuffleBank(this.subject, this.seed + this.pass);
      this.index = 0;
    }
    return this.order[this.index++];
  }
}

/** A seed that changes once a day (local date). */
export function daySeed(now = new Date()): number {
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}
