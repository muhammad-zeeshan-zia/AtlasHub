const chatLauncher = document.getElementById("chatLauncher");
const chatWidget = document.getElementById("chatWidget");
const chatClose = document.getElementById("chatClose");
const chatBody = document.getElementById("chatBody");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

let mainQuickRepliesHTML = "";

const RESOURCE_QUICK_TABS = [
  {
    id: "saved",
    label: "Saved",
    prompt: "Where can I find my saved resources on Atlas Hub?"
  },
  {
    id: "crisis",
    label: "Crisis",
    prompt: "I need crisis support and hotlines"
  },
  {
    id: "mental",
    label: "Mental Health",
    prompt: "I need mental health help"
  },
  {
    id: "healthcare",
    label: "Healthcare",
    prompt: "I need affordable healthcare or a clinic"
  },
  { id: "housing", label: "Housing", prompt: "I need housing help" },
  { id: "food", label: "Food", prompt: "I need food assistance" },
  {
    id: "transportation",
    label: "Transportation",
    prompt: "I need transportation help"
  },
  { id: "legal", label: "Legal Help", prompt: "I need legal help" },
  {
    id: "clothing",
    label: "Clothing & Household",
    prompt: "I need clothing or household items"
  },
  {
    id: "family",
    label: "Family Resources",
    prompt: "I need family resources"
  },
  {
    id: "homerepair",
    label: "Home Repair",
    prompt: "I need home repair help"
  },
  {
    id: "libraries",
    label: "Libraries",
    prompt: "Where are local libraries and learning resources"
  },
  {
    id: "police",
    label: "Police",
    prompt: "I need police department contacts"
  },
  {
    id: "hospital",
    label: "Hospitals",
    prompt: "I need hospital information"
  },
  {
    id: "victim",
    label: "Victim Support",
    prompt: "I need victim support services"
  },
  {
    id: "specialNeed",
    label: "Special Needs",
    prompt: "I need special needs or disability services"
  }
];

function restoreMainQuickReplies() {
  const el = document.querySelector(".quick-replies");
  if (!el || !mainQuickRepliesHTML) return;
  el.classList.remove("quick-replies--sub");
  el.innerHTML = mainQuickRepliesHTML;
}

function openResourcesQuickSubmenu() {
  const el = document.querySelector(".quick-replies");
  if (!el) return;
  if (!mainQuickRepliesHTML) {
    mainQuickRepliesHTML = el.innerHTML;
  }
  el.classList.add("quick-replies--sub");
  const buttons = RESOURCE_QUICK_TABS.map(
    (t) =>
      `<button type="button" class="quick-btn" data-resource-tab="${t.id}">${t.label}</button>`
  ).join("");
  el.innerHTML =
    buttons +
    `<button type="button" class="quick-btn quick-btn-back" data-quick-action="back">← Main menu</button>`;
}

if (chatLauncher && chatWidget) {
  chatLauncher.addEventListener("click", function () {
    chatWidget.style.display = "flex";
    setTimeout(() => {
      chatWidget.classList.add("active");
    }, 10);
    chatLauncher.style.display = "none";
    if (userInput) userInput.focus();
  });
}

if (chatClose && chatWidget && chatLauncher) {
  chatClose.addEventListener("click", function () {
    chatWidget.classList.remove("active");
    setTimeout(() => {
      chatWidget.style.display = "none";
      chatLauncher.style.display = "flex";
    }, 250);
  });
}

function sendMessageWithText(text) {
  const message = (text || "").trim();
  if (!message) return;

  addMessage(message, "user");
  showTyping();

  setTimeout(() => {
    removeTyping();
    addMessage(getBotReply(message), "bot");
  }, 500);
}

if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

if (userInput) {
  userInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
}

document.addEventListener("click", function (e) {
  const btn = e.target.closest(".quick-btn");
  if (!btn) return;

  if (btn.dataset.quickAction === "back") {
    restoreMainQuickReplies();
    return;
  }

  if (btn.dataset.quickResources === "open") {
    openResourcesQuickSubmenu();
    return;
  }

  const tabId = btn.dataset.resourceTab;
  if (tabId) {
    const tab = RESOURCE_QUICK_TABS.find((x) => x.id === tabId);
    if (tab && tab.prompt) {
      restoreMainQuickReplies();
      sendMessageWithText(tab.prompt);
    }
    return;
  }

  if (!userInput) return;
  userInput.value = btn.textContent.trim();
  sendMessage();
});

function addMessage(text, sender) {
  if (!chatBody) return;

  const row = document.createElement("div");
  row.className = "message-row " + sender;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function showTyping() {
  if (!chatBody) return;

  const row = document.createElement("div");
  row.className = "message-row bot";
  row.id = "typingRow";

  const typing = document.createElement("div");
  typing.className = "typing";
  typing.innerHTML = "<span></span><span></span><span></span>";

  row.appendChild(typing);
  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function removeTyping() {
  const typingRow = document.getElementById("typingRow");
  if (typingRow) typingRow.remove();
}

function sendMessage() {
  if (!userInput) return;

  const message = userInput.value.trim();
  if (!message) return;

  userInput.value = "";
  sendMessageWithText(message);
}

function normalizeMessage(message) {
  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, keywords) {
  return keywords.some((word) => text.includes(word));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isQuestion(text) {
  return (
    text.includes("?") ||
    /^(what|where|when|why|how|can|do|does|is|are|who|which|would|could|should)\b/.test(text)
  );
}

function getBestCategoryMatch(msg) {
  let bestMatch = null;

  for (let i = 0; i < RESOURCE_CATEGORIES.length; i++) {
    const category = RESOURCE_CATEGORIES[i];

    for (let j = 0; j < category.keywords.length; j++) {
      const keyword = category.keywords[j];

      if (msg.includes(keyword)) {
        if (!bestMatch || keyword.length > bestMatch.keyword.length) {
          bestMatch = {
            name: category.name,
            keyword: keyword,
            response: category.response
          };
        }
      }
    }
  }

  return bestMatch;
}

const RESPONSES = {
  greetings: [
    "Hello! Welcome to Atlas Hub. I can help you find local resources, events, contact details, feedback information, and the right page on the site.",
    "Hi there! I’m here to help you explore Atlas Hub and connect with community resources, services, and events.",
    "Hey! Welcome to Atlas Hub. Ask me about resources, emergency help, events, contact information, or how to submit a resource."
  ],

  thanks: [
    "You’re welcome. I’m glad to help.",
    "Happy to help.",
    "Of course. Let me know if you want help finding a specific type of resource."
  ],

  fallback: [
    "I’m not fully sure what you mean yet, but I can help with resources, events, contact information, emergency help, feedback, or submitting a resource. Try asking for food help, housing, mental health, transportation, legal help, or events.",
    "I can help you navigate Atlas Hub. You can ask about local resources, crisis support, healthcare, food, housing, transportation, events, contact info, feedback, or how to submit a resource.",
    "I’m here to help with Atlas Hub. Try asking something like: \"I need food help\", \"How do I submit a resource?\", \"I need help with mental health\", or \"How do I contact Atlas Hub?\""
  ],

  resourcesGeneral: [
    "The Resources page is the best place to browse support services in one place. It includes crisis help, mental health, affordable healthcare, housing, food, transportation, legal help, clothing and household support, family resources, home repair, libraries, hospitals, police departments, victim support, and special needs services.",
    "Atlas Hub’s Resources page is designed to help people quickly find trusted local help. You can browse by category or use the search bar to look for specific services like housing, food, healthcare, legal help, or family support."
  ],

  eventsGeneral: [
    "The Events page highlights community events, programs, workshops, outdoor activities, and family-friendly opportunities. If you want local engagement, that is the right page to check.",
    "You can visit the Events page to explore community calendars, programs, and trusted local activities."
  ],

  contact: [
    "You can contact Atlas Hub by email at atlashubprofessional@gmail.com. The site also lists Chester Springs, PA as the hub location, and there is a feedback form linked on the site.",
    "For contact information, Atlas Hub lists the email atlashubprofessional@gmail.com. You can also use the feedback form on the site for suggestions or questions."
  ],

  feedback: [
    "You can share suggestions, ideas, or concerns through the feedback form on the site. That is the best place to send feedback about the site, missing resources, or improvements.",
    "The best way to leave feedback is through the site’s feedback form. You can use it to report issues, suggest additions, or recommend improvements."
  ],

  submit: [
    "You can use the Submit Resource page to suggest a trusted organization, program, or service for review and possible addition to Atlas Hub.",
    "If you want to recommend a local service, nonprofit, or support program, go to the Submit Resource page and send it in for review."
  ],

  about: [
    "The About page explains the purpose of Atlas Hub, shares project information, and includes ways to provide feedback.",
    "If you want to learn more about the project itself, the About page is the best place to start."
  ],

  emergency: [
    "If this is an emergency or someone is in immediate danger, call 911 right now. For emotional crisis support, call or text 988 for the Suicide & Crisis Lifeline. Atlas Hub’s Crisis section also includes hotlines like Chester County Crisis Services and the Crisis Text Line.",
    "If you need urgent help right now, call 911 for immediate danger. For mental health crisis support, call or text 988. The Crisis tab on the Resources page lists several hotlines and supports."
  ]
};

const INTENTS = [
  {
    name: "greeting",
    keywords: [
      "hi",
      "hello",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
      "yo",
      "hiya",
      "hi there",
      "hello there",
      "hey there"
    ],
    response: () => randomChoice(RESPONSES.greetings)
  },
  {
    name: "thanks",
    keywords: [
      "thank you",
      "thanks",
      "thx",
      "ty",
      "thank u",
      "appreciate it",
      "thanks so much"
    ],
    response: () => randomChoice(RESPONSES.thanks)
  },
  {
    name: "emergency",
    keywords: [
      "emergency",
      "urgent",
      "danger",
      "unsafe",
      "help now",
      "immediate help",
      "call 911",
      "crisis now",
      "life threatening",
      "life-threatening"
    ],
    response: () => randomChoice(RESPONSES.emergency)
  },
  {
    name: "suicidal-crisis",
    keywords: [
      "suicide",
      "suicidal",
      "kill myself",
      "want to die",
      "i want to die",
      "end my life",
      "self harm",
      "self-harm",
      "hurt myself",
      "crisis line",
      "panic attack",
      "mental breakdown",
      "i am not safe",
      "someone is not safe"
    ],
    response: () =>
      "If you or someone else may be in immediate danger, call 911 now. For emotional crisis support, call or text 988 right away. The Crisis tab on the Resources page also lists Chester County Crisis Services, Crisis Text Line, and other hotlines."
  },
  {
    name: "events",
    keywords: [
      "event",
      "events",
      "calendar",
      "workshop",
      "program",
      "activities",
      "what is happening",
      "community event",
      "things to do",
      "local events"
    ],
    response: () => randomChoice(RESPONSES.eventsGeneral)
  },
  {
    name: "contact",
    keywords: [
      "contact",
      "email",
      "phone",
      "reach you",
      "reach atlas hub",
      "how do i contact",
      "customer service",
      "contact info",
      "contact information",
      "get in touch"
    ],
    response: () => randomChoice(RESPONSES.contact)
  },
  {
    name: "feedback",
    keywords: [
      "feedback",
      "comment",
      "suggestion",
      "report issue",
      "report a problem",
      "site issue",
      "bug",
      "improvement",
      "leave feedback",
      "give feedback"
    ],
    response: () => randomChoice(RESPONSES.feedback)
  },
  {
    name: "submit",
    keywords: [
      "submit resource",
      "submit a resource",
      "add resource",
      "suggest resource",
      "recommend resource",
      "send a resource",
      "list a resource",
      "add organization",
      "recommend an organization"
    ],
    response: () => randomChoice(RESPONSES.submit)
  },
  {
    name: "resources-general",
    keywords: [
      "resource",
      "resources",
      "support",
      "services",
      "community help",
      "find help",
      "need help",
      "assistance",
      "aid",
      "local services",
      "community services"
    ],
    response: () => randomChoice(RESPONSES.resourcesGeneral)
  },
  {
    name: "about",
    keywords: [
      "about",
      "about atlas hub",
      "project",
      "mission",
      "what is atlas hub",
      "who made this",
      "about us",
      "what is this site"
    ],
    response: () => randomChoice(RESPONSES.about)
  }
];

const RESOURCE_CATEGORIES = [
  {
    name: "crisis",
    keywords: [
      "crisis",
      "crisis help",
      "crisis support",
      "crisis hotline",
      "immediate emotional distress",
      "need help now",
      "someone to talk to",
      "warm line",
      "crisis text line",
      "988",
      "veterans crisis",
      "rainn",
      "sexual assault hotline",
      "domestic violence hotline",
      "human trafficking",
      "hotline",
      "helpline"
    ],
    response:
      "The Crisis tab lists hotlines like 988 Suicide & Crisis Lifeline, Chester County Crisis Services, Crisis Text Line, Veterans Crisis Line, RAINN Sexual Assault Hotline, the National Domestic Violence Hotline, the National Human Trafficking Hotline, and other 24/7 supports. If there is immediate danger, call 911 first."
  },
  {
    name: "mental-health",
    keywords: [
      "mental health",
      "need help with mental health",
      "help with mental health",
      "mental health help",
      "therapy",
      "therapist",
      "counseling",
      "counselling",
      "counselor",
      "depression",
      "depressed",
      "feeling depressed",
      "sad",
      "feeling sad",
      "down",
      "anxiety",
      "anxious",
      "panic",
      "panic attack",
      "stress",
      "stressed",
      "trauma",
      "ptsd",
      "behavioral health",
      "psychiatry",
      "emotional support",
      "mental illness",
      "struggling emotionally"
    ],
    response:
      "The Mental Health tab lists Community Care Behavioral Health and several contracted providers for children, teens, and adults (Human Services, Holcomb, Devereux, Creative Health), plus programs like Compeer and Family Service of Chester County."
  },
  {
    name: "healthcare",
    keywords: [
      "healthcare",
    "health care",
    "health",
    "health help",
    "health issues",
    "health problems",
    "doctor",
    "doctors",
    "doctor visit",
    "see a doctor",
    "need a doctor",
    "find a doctor",
    "clinic",
    "medical care",
    "medical help",
    "affordable healthcare",
    "health insurance",
    "insurance",
    "no insurance",
    "without insurance",
    "medicaid",
    "medical assistance",
    "free clinic",
    "low cost clinic",
    "low-cost clinic",
    "prescription help",
    "medication help",
    "dental",
    "dentist",
    "vision",
    "eye doctor",
    "medical bill",
    "medical bills"
    ],
    response:
      "The Affordable Healthcare tab includes the Chester County Health Department, Maternal and Child Health, Medicaid and Medical Assistance information, Phoenixville Free Clinic, Community Volunteers in Medicine (CVIM), and other free or low‑cost medical, dental, and vision options."
  },
  {
    name: "housing",
    keywords: [
      "housing",
      "house",
      "home",
      "i need home",
      "i need a home",
      "i need house",
      "i need a house",
      "place to live",
      "somewhere to live",
      "a place to stay",
      "need a home",
      "need housing",
      "shelter",
      "emergency shelter",
      "homeless",
      "i am homeless",
      "homelessness",
      "unhoused",
      "living in my car",
      "rent help",
      "rent assistance",
      "help with rent",
      "eviction",
      "eviction help",
      "behind on rent",
      "apartment help",
      "temporary housing",
      "safe harbor",
      "motel voucher"
    ],
    response:
      "The Housing tab lists programs like Safe Harbor, Friends Association, Bridge of Hope, CYWA, Home of the Sparrow, and others that support emergency shelter, homelessness prevention, and longer‑term housing stability. 2‑1‑1 and county numbers for coordinated entry are also included there."
  },
  {
    name: "food",
    keywords: [
      "food",
      "i need food",
      "need food",
      "food help",
      "food pantry",
      "pantry",
      "food bank",
      "need groceries",
      "groceries",
      "free food",
      "food stamps",
      "snap",
      "ebt",
      "hungry",
      "i am hungry",
      "no food",
      "out of food",
      "meal",
      "meals",
      "free meals",
      "dinner",
      "lunch",
      "breakfast",
      "school lunch",
      "school meals",
      "lunch program",
      "nutrition",
      "food insecurity"
    ],
    response:
      "The Food tab includes SNAP and National School Lunch information, Chester County Food Bank programs, Fresh2You Mobile Market, Salvation Army meal programs, and other local food and nutrition resources."
  },
  {
    name: "transportation",
    keywords: [
      "transportation",
      "transport",
      "transport help",
      "ride",
      "rides",
      "need a ride",
      "get a ride",
      "bus",
      "bus pass",
      "bus fare",
      "bus ticket",
      "getting around",
      "no car",
      "dont have a car",
      "don't have a car",
      "car help",
      "need a car",
      "car program",
      "medical ride",
      "ride to doctor",
      "transit",
      "public transit",
      "train",
      "travel help",
      "senior transportation",
      "matp",
      "transportation help"
    ],
    response:
      "The Transportation tab lists Chesco Connect Community Transit, the Medical Assistance Transportation Program (MATP) for medical rides, and Open Hearth programs that help people build savings toward transportation and car ownership."
  },
  {
    name: "legal",
    keywords: [
      "legal",
      "legal help",
      "lawyer",
      "attorney",
      "court",
      "legal aid",
      "free lawyer",
      "eviction court",
      "housing court",
      "custody",
      "family court",
      "immigration help",
      "green card help",
      "rights",
      "tenant rights",
      "legal support",
      "public defender",
      "criminal case",
      "record expungement",
      "expunge my record"
    ],
    response:
      "The Legal Help tab includes Chester County Bar Association Lawyer Referral, Legal Aid of Southeastern PA, the Public Defender’s Office, and county housing and community development contacts for legal and housing‑related issues."
  },
  {
    name: "clothing-household",
    keywords: [
      "clothing",
      "clothes",
      "clothing help",
      "need clothes",
      "coat",
      "winter coat",
      "jackeet",
      "jacket",
      "hoodie",
      "sweater",
      "shoes",
      "boots",
      "sneakers",
      "household",
      "furniture",
      "bed",
      "mattress",
      "blankets",
      "sheets",
      "school clothes",
      "thrift",
      "thrift store",
      "diapers",
      "toiletries",
      "hygiene items",
      "essentials",
      "basic needs",
      "household goods"
    ],
    response:
      "The Clothing and Household tab lists places like Community Warehouse Project, Habitat ReStores, Salvation Army, Phoenixville Hospital Thrift Shop, GreenDrop, and other sites that provide clothing and household items."
  },
  {
    name: "family",
    keywords: [
      "family",
      "family help",
      "family support",
      "child help",
      "kid help",
      "help kids",
      "help my kids",
      "help my child",
      "help my children",
      "parenting",
      "childcare",
      "child care",
      "daycare",
      "after school",
      "after-school",
      "youth program",
      "teen program",
      "children",
      "kids",
      "teens",
      "youth",
      "pregnancy",
      "pregnant",
      "new parent",
      "single parent",
      "babysitting help",
      "child support"
    ],
    response:
      "The Family Resources tab includes Children, Youth & Families, Phoenixville Area Positive Alternatives (PAPA), A Baby’s Breath, YWCA Tri‑County youth programs, and SPCA pet support resources."
  },
  {
    name: "home-repair",
    keywords: [
      "home repair",
      "house repair",
      "repair my house",
      "fix my house",
      "fix my home",
      "home fix",
      "repair my home",
      "roof repair",
      "leaky roof",
      "roof leak",
      "heater repair",
      "furnace repair",
      "boiler repair",
      "plumbing",
      "plumber",
      "pipe leak",
      "electric",
      "electrical",
      "wiring",
      "home maintenance",
      "repair assistance",
      "home improvement help",
      "weatherization",
      "need repairs",
      "house repairs"
    ],
    response:
      "The Home Repair tab lists programs such as Good Works, Habitat for Humanity Home Repair, Good Neighbors Home Repair, and similar services that help eligible homeowners with critical repairs and accessibility work."
  },
  {
    name: "libraries",
    keywords: [
      "library",
      "libraries",
      "public library",
      "books",
      "book loan",
      "computer access",
      "internet access",
      "wifi",
      "printing",
      "study space",
      "study room",
      "tutoring",
      "literacy",
      "learning resources"
    ],
    response:
      "The Libraries and Resources tab includes Chester County libraries and related learning resources where people can access books, technology, and community programs."
  },
  {
    name: "police",
    keywords: [
      "police",
      "cop",
      "cops",
      "need cop",
      "call the police",
      "police officer",
      "police station",
      "police department",
      "report crime",
      "file a report",
      "file police report",
      "safety report",
      "law enforcement"
    ],
    response:
      "Atlas Hub includes a Police Departments tab so users can find local non‑emergency police contact information and safety resources. For emergencies, always call 911."
  },
  {
    name: "hospitals",
    keywords: [
      "hospital",
    "hospitals",
    "er",
    "emergency room",
    "urgent medical",
    "medical emergency",
    "need a hospital",
    "sick",
    "i am sick",
    "not feeling well",
    "fever",
    "throwing up",
    "vomiting",
    "severe pain",
    "chest pain"
    ],
    response:
      "The Hospitals tab lists Chester County hospitals and emergency departments. If someone has a life‑threatening emergency, call 911 immediately."
  },
  {
    name: "victim-support",
    keywords: [
      "victim",
      "victim help",
      "victim services",
      "victim support",
      "crime",
      "crime victim",
      "victim of crime",
      "violent crime",
      "domestic violence",
      "relationship abuse",
      "abuse",
      "abused",
      "sexual assault",
      "rape",
      "protective order",
      "protection from abuse",
      "pfa",
      "safe place",
      "unsafe at home"
    ],
    response:
      "The Victim Support tab links to county victim services and organizations that offer safety planning, counseling, advocacy, and legal support for people affected by crime or abuse. If someone is in immediate danger, call 911."
  },
  {
    name: "special-needs",
    keywords: [
      "special needs",
      "specialneeds",
      "special need help",
      "disability",
      "disabled",
      "handicap",
      "handicapped",
      "help for handicap",
      "help for disabled",
      "autism",
      "developmental disability",
      "intellectual disability",
      "help for blind",
      "blind",
      "blind person",
      "visually impaired",
      "vision impaired",
      "blind services",
      "low vision",
      "vision loss",
      "hearing",
      "hearing loss",
      "hearing impaired",
      "deaf",
      "hard of hearing",
      "sign language",
      "accessibility",
      "accommodations",
      "support services",
      "caregiver support"
    ],
    response:
      "The Special Needs Services tab includes programs for people with disabilities and developmental differences and their families, including school‑age and adult supports."
  }
];

const PAGE_GUIDANCE = [
  {
    keywords: [
      "home page",
      "homepage",
      "the home page",
      "main page",
      "landing page",
      "go to home page",
      "go back to home"
    ],
    response:
      "The Home page is the best starting point if you want an overview of Atlas Hub and quick links into major areas like Resources, Events, and Submit Resource."
  },
  {
    keywords: ["resources page", "resource page", "open resources page"],
    response:
      "Use the Resources page to browse community help by category or search for a specific service."
  },
  {
    keywords: ["events page", "open events page", "where are events"],
    response:
      "Use the Events page to browse local activities, workshops, programs, and community happenings."
  },
  {
    keywords: ["submit page", "submit resource page", "open submit resource"],
    response:
      "Use the Submit Resource page if you want to recommend a local organization, service, or program for review."
  },
  {
    keywords: ["about page", "open about page", "learn more about atlas hub"],
    response:
      "Use the About page to learn more about Atlas Hub and find project‑related information."
  }
];

function getFAQResponse(msg) {
  if (
    includesAny(msg, [
      "saved resources",
      "my saved",
      "saved list",
      "saved tab",
      "bookmarked resources",
      "where can i find my saved"
    ])
  ) {
    return "Open the Resources page and use the Saved tab to review organizations you saved while browsing. Saves are stored in this browser on your device.";
  }

  if (
    includesAny(msg, [
      "what can you do",
      "how can you help",
      "help me use this site",
      "what do you do"
    ])
  ) {
    return "I can help you navigate Atlas Hub. I can point you to resource categories, explain what each page is for, suggest where to look for help, share contact information, explain how to submit a resource, and guide people toward emergency or crisis support when needed.";
  }

  if (
    includesAny(msg, [
      "where do i start",
      "i dont know where to start",
      "i don't know where to start",
      "start here"
    ])
  ) {
    return "A good place to start is the Resources page if you need help, the Events page if you want community programs, or the Home page if you want an overview. If you tell me what kind of help you need, I can suggest the best category.";
  }

  if (
    includesAny(msg, [
      "chester county",
      "local help",
      "local resources",
      "community resources"
    ])
  ) {
    return "Atlas Hub is organized to help people explore trusted local support options in Chester County, including crisis help, food, housing, healthcare, transportation, and more.";
  }

  if (
    includesAny(msg, [
      "is this free",
      "does it cost money",
      "free help",
      "free services",
      "cost money"
    ])
  ) {
    return "Atlas Hub itself is a free community resource hub. Many listed services focus on affordable or no‑cost support, but exact costs depend on the specific organization or program.";
  }

  if (
    includesAny(msg, [
      "are these trusted",
      "can i trust these",
      "is this reliable",
      "are these legit"
    ])
  ) {
    return "Atlas Hub is designed to highlight trusted local organizations, programs, and services. New resources can also be suggested through the Submit Resource page for review.";
  }

  if (
    includesAny(msg, [
      "can i volunteer",
      "volunteer opportunities",
      "get involved",
      "how can i help"
    ])
  ) {
    return "Atlas Hub mainly focuses on helping people find services and community support. Some resources and events may offer volunteer opportunities, and you can also submit helpful organizations through the Submit Resource page.";
  }

  if (
    includesAny(msg, [
      "how do i submit feedback",
      "where is the feedback form",
      "leave feedback"
    ])
  ) {
    return "You can use the feedback form on the site to share suggestions, report issues, or recommend improvements.";
  }

  if (
    includesAny(msg, [
      "how do i submit a resource",
      "where can i submit a resource",
      "add organization",
      "recommend an organization"
    ])
  ) {
    return "Use the Submit Resource page to suggest a trusted local organization, service, or program for review and possible inclusion on Atlas Hub.";
  }

  if (
    includesAny(msg, [
      "quick replies",
      "buttons in the chat",
      "what are the buttons"
    ])
  ) {
    return "The quick reply buttons are shortcuts for common topics like Resources, Events, Contact, Submit Resource, Feedback, and Emergency Help.";
  }

  if (
    includesAny(msg, [
      "website email",
      "atlas hub email",
      "email address"
    ])
  ) {
    return "Atlas Hub’s contact email is atlashubprofessional@gmail.com.";
  }

  if (
    includesAny(msg, [
      "location",
      "where are you based",
      "where is atlas hub"
    ])
  ) {
    return "Atlas Hub is based in Chester Springs, PA and focuses on Chester County resources.";
  }

  return null;
}

function getCategoryResponse(msg) {
  const bestMatch = getBestCategoryMatch(msg);
  return bestMatch ? bestMatch.response : null;
}

function getIntentResponse(msg) {
  for (let i = 0; i < INTENTS.length; i++) {
    const intent = INTENTS[i];
    if (includesAny(msg, intent.keywords)) {
      return intent.response();
    }
  }
  return null;
}

function getPageGuidanceResponse(msg) {
  for (let i = 0; i < PAGE_GUIDANCE.length; i++) {
    const item = PAGE_GUIDANCE[i];
    if (includesAny(msg, item.keywords)) {
      return item.response;
    }
  }
  return null;
}

function getCombinedResourceResponse(msg) {
  const foundCategories = [];

  for (let i = 0; i < RESOURCE_CATEGORIES.length; i++) {
    const category = RESOURCE_CATEGORIES[i];
    for (let j = 0; j < category.keywords.length; j++) {
      const keyword = category.keywords[j];
      if (msg.includes(keyword)) {
        foundCategories.push(category.name);
        break;
      }
    }
  }

  if (foundCategories.length >= 2) {
    return "It sounds like you may need support in more than one area. The Resources page lets you explore multiple categories like Housing, Food, Affordable Healthcare, Mental Health, Transportation, Legal Help, Family Resources, and Crisis Support all in one place.";
  }

  return null;
}

function getHumanStyleResourceResponse(msg) {
  if (
    includesAny(msg, [
      "i need help",
      "i need support",
      "i need assistance",
      "can someone help me",
      "help"
    ])
  ) {
    return "I’m here to help point you in the right direction. The Resources page is the best place to start. If you tell me whether you need food, housing, healthcare, mental health, transportation, legal help, family support, or crisis help, I can narrow it down.";
  }

  if (
    includesAny(msg, [
      "i need food and housing",
      "food and shelter",
      "food and rent help"
    ])
  ) {
    return "For food and housing needs, start with the Food tab and the Housing tab on the Resources page. If the situation is urgent, the Crisis tab and 2‑1‑1 coordinated entry may also help.";
  }

  if (
    includesAny(msg, [
      "i need medical and mental health help",
      "doctor and therapy",
      "health and counseling"
    ])
  ) {
    return "For both medical and emotional support, check the Affordable Healthcare and Mental Health tabs on the Resources page. If someone is in crisis right now, use 988 or emergency services immediately.";
  }

  if (
    includesAny(msg, [
      "my family needs help",
      "help for my child",
      "help for my kids",
      "help for my parents"
    ])
  ) {
    return "The Family Resources tab is a strong place to start. Depending on what is needed, you may also want Food, Housing, Affordable Healthcare, or Special Needs Services.";
  }

  if (
    includesAny(msg, [
      "i need basic necessities",
      "i need essentials",
      "i need clothes and food"
    ])
  ) {
    return "Atlas Hub can help with basic needs. Check the Food tab for meals and pantry help, and the Clothing and Household tab for clothing, furniture, and other essentials.";
  }

  return null;
}

function getBotReply(message) {
  const msg = normalizeMessage(message);

  if (
    msg === "resources" ||
    msg === "resource" ||
    msg === "find resources" ||
    msg === "show resources"
  ) {
    return RESPONSES.resourcesGeneral[0];
  }

  if (
    msg === "events" ||
    msg === "event" ||
    msg === "show events" ||
    msg === "community events"
  ) {
    return RESPONSES.eventsGeneral[0];
  }

  if (
    msg === "contact" ||
    msg === "contact info" ||
    msg === "contact information" ||
    msg === "email" ||
    msg === "how do i contact atlas hub"
  ) {
    return RESPONSES.contact[0];
  }

  if (
    msg === "submit resource" ||
    msg === "submit a resource" ||
    msg === "add a resource" ||
    msg === "suggest a resource" ||
    msg === "recommend a resource"
  ) {
    return RESPONSES.submit[0];
  }

  if (
    msg === "feedback" ||
    msg === "leave feedback" ||
    msg === "give feedback" ||
    msg === "submit feedback"
  ) {
    return RESPONSES.feedback[0];
  }

  if (
    msg === "emergency help" ||
    msg === "emergency" ||
    msg === "urgent help" ||
    msg === "crisis help" ||
    msg === "help now"
  ) {
    return RESPONSES.emergency[0];
  }

  if (
    includesAny(msg, [
      "suicide",
      "suicidal",
      "kill myself",
      "want to die",
      "self harm",
      "self-harm",
      "hurt myself",
      "not safe",
      "unsafe",
      "abuse right now",
      "in danger",
      "danger right now"
    ])
  ) {
    return RESPONSES.emergency[0];
  }

  const faqResponse = getFAQResponse(msg);
  if (faqResponse) return faqResponse;

  const categoryResponse = getCategoryResponse(msg);
  if (categoryResponse) return categoryResponse;

  const combinedResponse = getCombinedResourceResponse(msg);
  if (combinedResponse) return combinedResponse;

  const humanResponse = getHumanStyleResourceResponse(msg);
  if (humanResponse) return humanResponse;

  const intentResponse = getIntentResponse(msg);
  if (intentResponse) return intentResponse;

  const pageResponse = getPageGuidanceResponse(msg);
  if (pageResponse) return pageResponse;

  if (
    isQuestion(msg) &&
    includesAny(msg, [
      "where can i find",
      "where do i find",
      "how do i find",
      "do you have",
      "can i get help with",
      "who helps with",
      "what resources are there for"
    ])
  ) {
    return "Atlas Hub may be able to help with that through the Resources page. Try the category that best matches your need, such as Food, Housing, Affordable Healthcare, Mental Health, Transportation, Legal Help, Family Resources, Victim Support, or Special Needs Services.";
  }

  return randomChoice(RESPONSES.fallback);
}

(function initQuickRepliesScrollFade() {
  function bind() {
    const body = document.getElementById("chatBody");
    const qr = document.querySelector("#chatWidget .quick-replies");
    if (!body || !qr) return;
    const sync = () => {
      qr.classList.toggle("quick-replies--chat-scroll", body.scrollTop > 18);
    };
    body.addEventListener("scroll", sync, { passive: true });
    sync();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();