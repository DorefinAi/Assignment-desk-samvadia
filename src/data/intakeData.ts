// Dummy intake for the assignment desk. Stands in for the WhatsApp Business and
// Outlook (Graph) connectors until they are wired to the backend.
import { ActivityEntry, Attachment, AiSuggestion, FeedEntry, FetchRun, FtpFolder, IntakeItem, Sender, Source, Stage } from "@/types/desk";
import { buildSlug, dayOf } from "@/lib/slug";

/** Where Octopus reads approved stories from. Placeholder until the real feed link is issued. */
export const FEED_URL = "https://feeds.vartamaan.ai/1st-india/assignment-desk.xml";
export const WHATSAPP_ACCOUNT = "1st India Desk · +91 90000 00100";
export const OUTLOOK_MAILBOX = "assignment.desk@firstindia.example";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

type AttachmentSeed = Omit<Attachment, "id" | "state" | "progress"> & { state?: Attachment["state"]; progress?: number };

interface Seed {
  id: string;
  source: Source;
  sender: Sender;
  chat?: string;
  subject?: string;
  rawText: string;
  attachments: AttachmentSeed[];
  ai: AiSuggestion;
  stage?: Stage;
  rejectReason?: string;
}

function makeItem(seed: Seed, receivedAt: string): IntakeItem {
  const firstLine = seed.rawText.split(/[।\n]/)[0].trim();
  return {
    ...seed,
    receivedAt,
    attachments: seed.attachments.map((a, i) => ({
      ...a,
      id: `${seed.id}-a${i + 1}`,
      state: a.state ?? "downloaded",
      progress: a.state === "downloading" ? a.progress ?? 0 : 100,
    })),
    aiHeadlineIndex: 0,
    stage: seed.stage ?? "new",
    draft: {
      headline: seed.subject ?? firstLine,
      body: seed.rawText,
      category: seed.ai.category,
      locationCode: seed.ai.locationCode,
      priority: seed.ai.priority,
      slug: buildSlug(seed.ai.locationCode, seed.ai.keywords),
      slugEdited: false,
    },
  };
}

// ─── Already in the desk when the shift opens ──────────────────────────────────
const SEEDS: [Seed, number][] = [
  [
    {
      id: "wa-101",
      source: "whatsapp",
      chat: "1st India Reporters · Jodhpur",
      sender: { name: "Mahendra Singh Rathore", contact: "+91 90000 00101", role: "Reporter" },
      rawText:
        "जोधपुर में तेज बारिश से कई इलाकों में जलभराव। पावटा, सरदारपुरा और रातानाडा में सड़कों पर 2 फीट तक पानी भरा। नगर निगम की टीमें मौके पर पहुंचीं, पंप लगाकर पानी निकाला जा रहा है। विजुअल भेज रहा हूं, निगम आयुक्त की बाइट थोड़ी देर में।",
      attachments: [
        { fileName: "VID-20261015-WA0012.mp4", kind: "video", sizeMb: 48.2 },
        { fileName: "VID-20261015-WA0013.mp4", kind: "video", sizeMb: 36.7, state: "downloading", progress: 58 },
        { fileName: "IMG-20261015-WA0014.jpg", kind: "image", sizeMb: 2.1 },
      ],
      ai: {
        headlines: ["जोधपुर में मूसलाधार बारिश, कई इलाकों में भरा 2 फीट पानी", "जोधपुर: तेज बारिश से पावटा-सरदारपुरा में जलभराव, निगम की टीमें तैनात", "बारिश से बेहाल जोधपुर, सड़कों पर पानी ही पानी"],
        summary: "Heavy rain caused waterlogging in Paota, Sardarpura and Ratanada; municipal teams are pumping water out. Commissioner's bite to follow.",
        body: "जोधपुर में आज दोपहर हुई तेज बारिश से शहर के कई इलाकों में जलभराव हो गया। पावटा, सरदारपुरा और रातानाडा में सड़कों पर करीब 2 फीट तक पानी भर गया, जिससे यातायात प्रभावित रहा। नगर निगम की टीमें मौके पर पहुंचकर पंपों से पानी निकाल रही हैं।",
        category: "Weather",
        locationCode: "JDH",
        priority: "high",
        keywords: ["RAIN", "WATERLOGGING"],
        confidence: 0.93,
        flags: [{ kind: "verify", text: "Reporter says the commissioner's bite is still to come. Keep the story open for an update." }],
      },
    },
    6,
  ],
  [
    {
      id: "ol-201",
      source: "outlook",
      subject: "मुख्यमंत्री ने जयपुर में 1,200 करोड़ की विकास परियोजनाओं का लोकार्पण किया",
      sender: { name: "DIPR Rajasthan", contact: "press.dipr@gov.example.in", role: "Press release" },
      rawText:
        "प्रेस विज्ञप्ति। मुख्यमंत्री ने आज जयपुर के बिड़ला सभागार में आयोजित कार्यक्रम में 1,200 करोड़ रुपये की 46 विकास परियोजनाओं का लोकार्पण एवं शिलान्यास किया। इनमें सड़क, पेयजल और शहरी विकास से जुड़ी परियोजनाएं शामिल हैं। मुख्यमंत्री ने कहा कि सभी परियोजनाएं तय समय में पूरी की जाएंगी।\n\nसंलग्न: प्रेस नोट एवं फोटो",
      attachments: [
        { fileName: "CM_Jaipur_Press_Note.pdf", kind: "document", sizeMb: 0.4 },
        { fileName: "CM_Jaipur_01.jpg", kind: "image", sizeMb: 3.2 },
        { fileName: "CM_Jaipur_02.jpg", kind: "image", sizeMb: 2.8 },
      ],
      ai: {
        headlines: ["सीएम ने जयपुर को दी 1,200 करोड़ की सौगात, 46 परियोजनाओं का लोकार्पण", "जयपुर: 46 विकास परियोजनाओं का लोकार्पण-शिलान्यास, 1,200 करोड़ होंगे खर्च"],
        summary: "Press release: CM inaugurated and laid foundation stones for 46 projects worth ₹1,200 crore at Birla Auditorium, Jaipur.",
        body: "मुख्यमंत्री ने आज जयपुर के बिड़ला सभागार में 1,200 करोड़ रुपये की 46 विकास परियोजनाओं का लोकार्पण और शिलान्यास किया। इनमें सड़क, पेयजल और शहरी विकास की परियोजनाएं शामिल हैं। मुख्यमंत्री ने कहा कि सभी काम तय समय पर पूरे किए जाएंगे।",
        category: "Politics",
        locationCode: "JPR",
        priority: "normal",
        keywords: ["CM", "PROJECTS", "LAUNCH"],
        confidence: 0.88,
        flags: [{ kind: "verify", text: "The ₹1,200 crore figure comes from the press note only. No reporter on the ground yet." }],
      },
    },
    14,
  ],
  [
    {
      id: "wa-102",
      source: "whatsapp",
      chat: "Stringers · Bhilwara",
      sender: { name: "Ramesh Jat", contact: "+91 90000 00117", role: "Stringer" },
      rawText: "भीलवाड़ा के सांगानेरी गेट पर ज्वेलरी शॉप में दिनदहाड़े चोरी। 2 युवक ग्राहक बनकर आए और सोने की चेन लेकर भागे। पूरी वारदात CCTV में कैद। कोतवाली पुलिस जांच में जुटी",
      attachments: [
        { fileName: "VID-20261015-WA0031.mp4", kind: "video", sizeMb: 12.4 },
        { fileName: "VID-20261015-WA0032.mp4", kind: "video", sizeMb: 22.9, state: "downloading", progress: 21 },
      ],
      ai: {
        headlines: ["भीलवाड़ा: ग्राहक बनकर आए बदमाश, ज्वेलरी शॉप से चेन लेकर फरार", "दिनदहाड़े ज्वेलरी शॉप में चोरी, CCTV में कैद हुई वारदात"],
        summary: "Two men posing as customers fled with a gold chain from a jewellery shop at Sanganeri Gate; caught on CCTV. Kotwali police investigating.",
        body: "भीलवाड़ा के सांगानेरी गेट इलाके में एक ज्वेलरी शॉप में दिनदहाड़े चोरी की वारदात हुई। ग्राहक बनकर आए दो युवक सोने की चेन लेकर फरार हो गए। पूरी घटना दुकान में लगे CCTV कैमरे में कैद हो गई है। कोतवाली पुलिस फुटेज के आधार पर आरोपियों की तलाश कर रही है।",
        category: "Crime",
        locationCode: "BHL",
        priority: "high",
        keywords: ["JEWELLERY", "THEFT", "CCTV"],
        confidence: 0.9,
        flags: [],
      },
    },
    19,
  ],
  [
    {
      id: "wa-103",
      source: "whatsapp",
      chat: "1st India Reporters · Kota",
      sender: { name: "Pooja Meena", contact: "+91 90000 00122", role: "Reporter" },
      rawText: "कोटा में डेंगू का कहर, 24 घंटे में 40 नए मरीज। MBS अस्पताल के मेडिसिन वार्ड में बेड फुल, मरीजों को फर्श पर लिटाना पड़ रहा। CMHO से बात हुई है, वॉइस नोट में डिटेल",
      attachments: [
        { fileName: "PTT-20261015-WA0040.opus", kind: "audio", sizeMb: 0.6 },
        { fileName: "IMG-20261015-WA0041.jpg", kind: "image", sizeMb: 1.8, state: "failed" },
        { fileName: "IMG-20261015-WA0042.jpg", kind: "image", sizeMb: 2.2 },
      ],
      ai: {
        headlines: ["कोटा में डेंगू का कहर: 24 घंटे में 40 नए मरीज, MBS अस्पताल में बेड फुल", "डेंगू से हाहाकार, कोटा के MBS अस्पताल में फर्श पर इलाज"],
        summary: "40 new dengue cases in Kota in 24 hours; MBS hospital medicine ward is full. CMHO details are in the voice note.",
        body: "कोटा में डेंगू के मामले तेजी से बढ़ रहे हैं। बीते 24 घंटे में 40 नए मरीज सामने आए हैं। MBS अस्पताल के मेडिसिन वार्ड में सभी बेड भर चुके हैं और कई मरीजों का इलाज फर्श पर करना पड़ रहा है।",
        category: "Health",
        locationCode: "KOT",
        priority: "high",
        keywords: ["DENGUE", "MBS", "HOSPITAL"],
        confidence: 0.86,
        flags: [
          { kind: "missing_media", text: "IMG-20261015-WA0041.jpg failed to download. Retry, or ask the reporter to send it again." },
          { kind: "verify", text: "The CMHO quote is only in the voice note. Transcribe it before the story goes out." },
        ],
      },
    },
    27,
  ],
  [
    {
      id: "ol-202",
      source: "outlook",
      subject: "जयपुर पुलिस: साइबर ठगी गिरोह का भंडाफोड़, 5 आरोपी गिरफ्तार",
      sender: { name: "Jaipur Police Commissionerate", contact: "pro.police@gov.example.in", role: "Press release" },
      rawText:
        "जयपुर पुलिस कमिश्नरेट की साइबर थाना टीम ने ऑनलाइन निवेश के नाम पर ठगी करने वाले गिरोह का भंडाफोड़ कर 5 आरोपियों को गिरफ्तार किया है। आरोपी सोशल मीडिया पर फर्जी ट्रेडिंग ऐप के जरिए लोगों से करीब 80 लाख रुपये की ठगी कर चुके हैं। आरोपियों के कब्जे से 14 मोबाइल फोन और 22 बैंक खातों की जानकारी मिली है।",
      attachments: [
        { fileName: "Cyber_Gang_Press_Note.pdf", kind: "document", sizeMb: 0.3 },
        { fileName: "Accused_Photo.jpg", kind: "image", sizeMb: 1.1 },
      ],
      ai: {
        headlines: ["फर्जी ट्रेडिंग ऐप से 80 लाख की ठगी, जयपुर में साइबर गिरोह के 5 आरोपी गिरफ्तार", "जयपुर: साइबर ठगों पर शिकंजा, 14 मोबाइल और 22 बैंक खाते मिले"],
        summary: "Jaipur cyber police arrested 5 men who ran a fake trading app scam worth about ₹80 lakh; 14 phones and 22 bank accounts found.",
        body: "जयपुर पुलिस की साइबर थाना टीम ने ऑनलाइन निवेश के नाम पर ठगी करने वाले गिरोह के 5 आरोपियों को गिरफ्तार किया है। आरोपी फर्जी ट्रेडिंग ऐप के जरिए लोगों से करीब 80 लाख रुपये ठग चुके हैं। पुलिस को उनके पास से 14 मोबाइल फोन और 22 बैंक खातों की जानकारी मिली है।",
        category: "Crime",
        locationCode: "JPR",
        priority: "normal",
        keywords: ["CYBER", "FRAUD", "ARREST"],
        confidence: 0.91,
        flags: [{ kind: "verify", text: "Press note includes a photo of the accused. Check the policy on showing faces before using it." }],
      },
    },
    33,
  ],
  [
    {
      id: "wa-104",
      source: "whatsapp",
      chat: "1st India Reporters · Jaipur",
      sender: { name: "Anil Sharma", contact: "+91 90000 00105", role: "Reporter" },
      rawText: "साइबर ठगी गैंग का भंडाफोड़, 5 गिरफ्तार, 80 लाख की ठगी। DCP साइबर की बाइट भेज दी है। आरोपियों का वीडियो भी है",
      attachments: [
        { fileName: "VID-20261015-WA0050.mp4", kind: "video", sizeMb: 64.0 },
        { fileName: "VID-20261015-WA0051.mp4", kind: "video", sizeMb: 18.3 },
      ],
      ai: {
        headlines: ["साइबर ठगी गैंग का पर्दाफाश, DCP बोले: और भी खुलासे होंगे"],
        summary: "Same cyber-fraud arrests as the police press note, with the DCP Cyber bite and video of the accused.",
        body: "जयपुर में साइबर ठगी करने वाले गिरोह के 5 आरोपियों को गिरफ्तार किया गया है। डीसीपी साइबर ने बताया कि आरोपियों ने करीब 80 लाख रुपये की ठगी की है और मामले में और खुलासे हो सकते हैं।",
        category: "Crime",
        locationCode: "JPR",
        priority: "normal",
        keywords: ["CYBER", "FRAUD", "BITE"],
        confidence: 0.84,
        flags: [{ kind: "duplicate", text: "Same story as the Jaipur Police press note (ol-202). Approve this one for the visuals and merge the text." }],
      },
    },
    38,
  ],
  [
    {
      id: "ol-203",
      source: "outlook",
      subject: "राजस्थान विश्वविद्यालय: सेमेस्टर परीक्षाओं का कार्यक्रम जारी",
      sender: { name: "University PRO", contact: "pro@university.example.in", role: "Press release" },
      rawText: "राजस्थान विश्वविद्यालय ने स्नातक और स्नातकोत्तर सेमेस्टर परीक्षाओं का कार्यक्रम जारी कर दिया है। परीक्षाएं 10 नवंबर से शुरू होंगी। प्रवेश पत्र 3 नवंबर से वेबसाइट पर उपलब्ध रहेंगे।",
      attachments: [{ fileName: "Exam_Schedule_Nov2026.pdf", kind: "document", sizeMb: 0.9 }],
      ai: {
        headlines: ["राजस्थान यूनिवर्सिटी की सेमेस्टर परीक्षाएं 10 नवंबर से, 3 नवंबर से मिलेंगे एडमिट कार्ड"],
        summary: "Rajasthan University semester exams start 10 November; admit cards from 3 November.",
        body: "राजस्थान विश्वविद्यालय ने स्नातक और स्नातकोत्तर सेमेस्टर परीक्षाओं का कार्यक्रम जारी कर दिया है। परीक्षाएं 10 नवंबर से शुरू होंगी। छात्र 3 नवंबर से विश्वविद्यालय की वेबसाइट से प्रवेश पत्र डाउनलोड कर सकेंगे।",
        category: "Education",
        locationCode: "JPR",
        priority: "normal",
        keywords: ["RU", "EXAM", "SCHEDULE"],
        confidence: 0.95,
        flags: [{ kind: "missing_media", text: "No visuals attached. Use file footage of the university campus." }],
      },
    },
    52,
  ],
  [
    {
      id: "wa-105",
      source: "whatsapp",
      chat: "1st India Reporters · Udaipur",
      sender: { name: "Kavita Paliwal", contact: "+91 90000 00131", role: "Reporter" },
      rawText: "फतेहसागर झील ओवरफ्लो, देखने उमड़े लोग। मानसून के बाद पहली बार चली चादर। ड्रोन शॉट्स भेज रही हूं",
      attachments: [
        { fileName: "VID-20261015-WA0060.mp4", kind: "video", sizeMb: 92.5, state: "downloading", progress: 9 },
        { fileName: "IMG-20261015-WA0061.jpg", kind: "image", sizeMb: 3.4 },
      ],
      ai: {
        headlines: ["उदयपुर: फतेहसागर झील ओवरफ्लो, चादर देखने उमड़े लोग", "झीलों की नगरी में बहार, फतेहसागर पर चली चादर"],
        summary: "Fateh Sagar lake overflowed for the first time this season; crowds gathered. Drone shots attached.",
        body: "उदयपुर की फतेहसागर झील इस सीजन में पहली बार ओवरफ्लो हो गई। झील पर चली चादर देखने के लिए बड़ी संख्या में लोग पहुंचे। प्रशासन ने सुरक्षा के लिए किनारों पर पुलिस तैनात की है।",
        category: "Weather",
        locationCode: "UDR",
        priority: "normal",
        keywords: ["FATEHSAGAR", "OVERFLOW"],
        confidence: 0.79,
        flags: [{ kind: "location", text: "The message doesn't name the city. Udaipur is taken from the WhatsApp group name." }],
      },
    },
    61,
  ],
  [
    {
      id: "ol-204",
      source: "outlook",
      subject: "Festive offer – feature our brand on your channel",
      sender: { name: "Brand Partnerships", contact: "promo@brand.example.com", role: "Agency" },
      rawText: "Dear team, we would like to feature our Diwali collection on your news channel. Please share your rate card for sponsored stories.",
      attachments: [{ fileName: "Diwali_Catalogue.pdf", kind: "document", sizeMb: 6.2 }],
      ai: {
        headlines: ["Sponsored content request"],
        summary: "Advertising request, not a news story.",
        body: "",
        category: "Business",
        locationCode: "DEL",
        priority: "normal",
        keywords: ["SPONSORED"],
        confidence: 0.4,
        flags: [{ kind: "verify", text: "Reads as an ad request. Forward to the marketing team instead." }],
      },
      stage: "rejected",
      rejectReason: "Advertising request, not news",
    },
    74,
  ],
  [
    {
      id: "wa-106",
      source: "whatsapp",
      chat: "1st India Reporters · Bikaner",
      sender: { name: "Shyam Sundar Swami", contact: "+91 90000 00144", role: "Reporter" },
      rawText: "बीकानेर में अंतरराष्ट्रीय ऊंट उत्सव की तैयारियां शुरू। इस बार विदेशी पर्यटकों के लिए नए कार्यक्रम। विजुअल और कलेक्टर की बाइट",
      attachments: [
        { fileName: "VID-20261015-WA0070.mp4", kind: "video", sizeMb: 41.0 },
        { fileName: "VID-20261015-WA0071.mp4", kind: "video", sizeMb: 15.5 },
      ],
      ai: {
        headlines: ["बीकानेर ऊंट उत्सव की तैयारियां शुरू, विदेशी पर्यटकों के लिए नए कार्यक्रम"],
        summary: "Preparations begin for the Bikaner camel festival, with new events for foreign tourists. Collector's bite attached.",
        body: "बीकानेर में अंतरराष्ट्रीय ऊंट उत्सव की तैयारियां शुरू हो गई हैं। इस बार विदेशी पर्यटकों के लिए कई नए कार्यक्रम जोड़े गए हैं। जिला कलेक्टर ने बताया कि उत्सव को और भव्य बनाने की तैयारी है।",
        category: "Entertainment",
        locationCode: "BKN",
        priority: "normal",
        keywords: ["CAMEL", "FESTIVAL"],
        confidence: 0.94,
        flags: [],
      },
      stage: "published",
    },
    96,
  ],
  [
    {
      id: "ol-205",
      source: "outlook",
      subject: "अजमेर: उर्स के लिए ट्रैफिक प्लान जारी",
      sender: { name: "Ajmer Police", contact: "sp.ajmer@gov.example.in", role: "Press release" },
      rawText: "उर्स के दौरान दरगाह क्षेत्र में भीड़ को देखते हुए अजमेर पुलिस ने ट्रैफिक प्लान जारी किया है। दरगाह बाजार और नला बाजार में वाहनों का प्रवेश बंद रहेगा। जायरीनों के लिए 6 पार्किंग स्थल तय किए गए हैं।",
      attachments: [
        { fileName: "Traffic_Plan_Map.jpg", kind: "image", sizeMb: 2.6 },
        { fileName: "Traffic_Plan.pdf", kind: "document", sizeMb: 0.5 },
      ],
      ai: {
        headlines: ["उर्स के लिए अजमेर में ट्रैफिक प्लान, दरगाह बाजार में वाहनों की नो-एंट्री"],
        summary: "Ajmer police issue an Urs traffic plan: no vehicles in Dargah and Nala bazaars, 6 parking areas for pilgrims.",
        body: "उर्स के दौरान दरगाह क्षेत्र में भीड़ को देखते हुए अजमेर पुलिस ने ट्रैफिक प्लान जारी किया है। दरगाह बाजार और नला बाजार में वाहनों का प्रवेश बंद रहेगा। जायरीनों के लिए 6 पार्किंग स्थल बनाए गए हैं।",
        category: "Civic",
        locationCode: "AJM",
        priority: "normal",
        keywords: ["URS", "TRAFFIC", "PLAN"],
        confidence: 0.92,
        flags: [],
      },
      stage: "published",
    },
    118,
  ],
];

// ─── Arrives during the session, one per auto-fetch ────────────────────────────
export const INCOMING: Seed[] = [
  {
    id: "wa-107",
    source: "whatsapp",
    chat: "Stringers · Sikar",
    sender: { name: "Hanuman Saini", contact: "+91 90000 00152", role: "Stringer" },
    rawText: "सीकर कलेक्ट्रेट पर किसानों का धरना, फसल बीमा क्लेम जल्द देने की मांग। सैकड़ों किसान मौजूद, ट्रैक्टर रैली भी निकाली",
    attachments: [
      { fileName: "VID-20261015-WA0080.mp4", kind: "video", sizeMb: 28.1, state: "downloading", progress: 0 },
      { fileName: "IMG-20261015-WA0081.jpg", kind: "image", sizeMb: 2.0, state: "downloading", progress: 0 },
    ],
    ai: {
      headlines: ["सीकर में किसानों का हल्लाबोल, फसल बीमा क्लेम के लिए कलेक्ट्रेट पर धरना", "फसल बीमा क्लेम की मांग, सीकर में ट्रैक्टर रैली"],
      summary: "Hundreds of farmers protest at Sikar collectorate demanding crop insurance claims; tractor rally held.",
      body: "सीकर में फसल बीमा क्लेम जल्द दिलाने की मांग को लेकर सैकड़ों किसानों ने कलेक्ट्रेट पर धरना दिया। किसानों ने ट्रैक्टर रैली भी निकाली और प्रशासन को ज्ञापन सौंपा।",
      category: "Agriculture",
      locationCode: "SKR",
      priority: "normal",
      keywords: ["FARMERS", "PROTEST", "INSURANCE"],
      confidence: 0.89,
      flags: [],
    },
  },
  {
    id: "ol-206",
    source: "outlook",
    subject: "मौसम विभाग: अगले 48 घंटे में 8 जिलों में भारी बारिश का अलर्ट",
    sender: { name: "IMD Jaipur", contact: "imd.jaipur@gov.example.in", role: "Press release" },
    rawText: "मौसम केंद्र जयपुर के अनुसार अगले 48 घंटे में जयपुर, अजमेर, टोंक, कोटा, बूंदी, भीलवाड़ा, उदयपुर और चित्तौड़गढ़ में भारी बारिश की संभावना है। ऑरेंज अलर्ट जारी किया गया है।",
    attachments: [{ fileName: "IMD_Bulletin_15Oct.pdf", kind: "document", sizeMb: 1.2 }],
    ai: {
      headlines: ["8 जिलों में भारी बारिश का ऑरेंज अलर्ट, अगले 48 घंटे अहम", "मौसम विभाग की चेतावनी: जयपुर समेत 8 जिलों में भारी बारिश"],
      summary: "IMD issues an orange alert for heavy rain in 8 districts including Jaipur, Kota and Udaipur over the next 48 hours.",
      body: "मौसम केंद्र जयपुर ने अगले 48 घंटे में प्रदेश के 8 जिलों में भारी बारिश का ऑरेंज अलर्ट जारी किया है। इनमें जयपुर, अजमेर, टोंक, कोटा, बूंदी, भीलवाड़ा, उदयपुर और चित्तौड़गढ़ शामिल हैं।",
      category: "Weather",
      locationCode: "JPR",
      priority: "breaking",
      keywords: ["IMD", "RAIN", "ALERT"],
      confidence: 0.96,
      flags: [{ kind: "location", text: "Covers 8 districts. Filed under Jaipur because the bulletin is from the Jaipur centre." }],
    },
  },
  {
    id: "wa-108",
    source: "whatsapp",
    chat: "1st India Reporters · Alwar",
    sender: { name: "Deepak Yadav", contact: "+91 90000 00163", role: "Reporter" },
    rawText: "BREAKING अलवर में NH-248 पर बस और ट्रक की भिड़ंत, 3 की मौत, 12 घायल। घायलों को जिला अस्पताल भेजा। मौके के विजुअल",
    attachments: [
      { fileName: "VID-20261015-WA0090.mp4", kind: "video", sizeMb: 33.8, state: "downloading", progress: 0 },
      { fileName: "VID-20261015-WA0091.mp4", kind: "video", sizeMb: 19.2, state: "downloading", progress: 0 },
      { fileName: "IMG-20261015-WA0092.jpg", kind: "image", sizeMb: 2.4, state: "downloading", progress: 0 },
    ],
    ai: {
      headlines: ["अलवर में भीषण सड़क हादसा: बस-ट्रक की टक्कर में 3 की मौत, 12 घायल", "NH-248 पर बस और ट्रक भिड़े, 3 लोगों की जान गई"],
      summary: "Bus and truck collided on NH-248 in Alwar; 3 dead and 12 injured, taken to the district hospital.",
      body: "अलवर में NH-248 पर बस और ट्रक की आमने-सामने भिड़ंत में 3 लोगों की मौत हो गई और 12 लोग घायल हो गए। घायलों को जिला अस्पताल में भर्ती कराया गया है। पुलिस मौके पर पहुंचकर जांच कर रही है।",
      category: "Accident",
      locationCode: "ALW",
      priority: "breaking",
      keywords: ["BUS", "TRUCK", "ACCIDENT"],
      confidence: 0.92,
      flags: [{ kind: "verify", text: "Casualty figures are from the reporter only. Confirm with police before the bulletin." }],
    },
  },
  {
    id: "ol-207",
    source: "outlook",
    subject: "हाईकोर्ट ने शिक्षक भर्ती परीक्षा के परिणाम पर लगाई रोक",
    sender: { name: "Sunil Sharma", contact: "sunil.sharma@firstindia.example", role: "Reporter" },
    rawText: "राजस्थान हाईकोर्ट ने शिक्षक भर्ती परीक्षा के परिणाम जारी करने पर अंतरिम रोक लगा दी है। याचिका में प्रश्नपत्र के कुछ सवालों पर आपत्ति जताई गई थी। अगली सुनवाई 4 नवंबर को होगी। कोर्ट के बाहर का PTC अटैच है।",
    attachments: [{ fileName: "HC_Jodhpur_PTC.mp4", kind: "video", sizeMb: 54.6 }],
    ai: {
      headlines: ["शिक्षक भर्ती परीक्षा के परिणाम पर हाईकोर्ट की रोक, 4 नवंबर को अगली सुनवाई"],
      summary: "Rajasthan High Court stays the teacher recruitment exam results over disputed questions; next hearing on 4 November.",
      body: "राजस्थान हाईकोर्ट ने शिक्षक भर्ती परीक्षा के परिणाम जारी करने पर अंतरिम रोक लगा दी है। याचिका में प्रश्नपत्र के कुछ सवालों पर आपत्ति जताई गई थी। मामले की अगली सुनवाई 4 नवंबर को होगी।",
      category: "Courts",
      locationCode: "JDH",
      priority: "high",
      keywords: ["HC", "TEACHER", "RESULT"],
      confidence: 0.81,
      flags: [{ kind: "location", text: "The reporter is Jaipur-based but the PTC was shot at the Jodhpur principal seat. Check the location." }],
    },
  },
  {
    id: "wa-109",
    source: "whatsapp",
    chat: "1st India Reporters · Barmer",
    sender: { name: "Gopal Choudhary", contact: "+91 90000 00171", role: "Reporter" },
    rawText: "पचपदरा रिफाइनरी का काम अंतिम चरण में, अगले साल से उत्पादन शुरू होने की उम्मीद। प्रोजेक्ट हेड से बातचीत",
    attachments: [{ fileName: "VID-20261015-WA0100.mp4", kind: "video", sizeMb: 71.3, state: "downloading", progress: 0 }],
    ai: {
      headlines: ["पचपदरा रिफाइनरी का काम अंतिम चरण में, अगले साल से उत्पादन की उम्मीद"],
      summary: "Pachpadra refinery in Barmer is in its final phase; production expected to begin next year.",
      body: "बाड़मेर की पचपदरा रिफाइनरी का निर्माण कार्य अंतिम चरण में पहुंच गया है। प्रोजेक्ट से जुड़े अधिकारियों के अनुसार अगले साल से उत्पादन शुरू होने की उम्मीद है।",
      category: "Business",
      locationCode: "BMR",
      priority: "normal",
      keywords: ["REFINERY", "PACHPADRA"],
      confidence: 0.9,
      flags: [],
    },
  },
  {
    id: "ol-208",
    source: "outlook",
    subject: "केवलादेव राष्ट्रीय उद्यान में पहुंचने लगे प्रवासी पक्षी",
    sender: { name: "Forest Department", contact: "dfo.bharatpur@gov.example.in", role: "Press release" },
    rawText: "भरतपुर के केवलादेव राष्ट्रीय उद्यान में प्रवासी पक्षियों का आना शुरू हो गया है। इस बार साइबेरिया और मध्य एशिया से 40 से अधिक प्रजातियों के पक्षियों के आने की उम्मीद है।",
    attachments: [
      { fileName: "Keoladeo_Birds_01.jpg", kind: "image", sizeMb: 4.1 },
      { fileName: "Keoladeo_Birds_02.jpg", kind: "image", sizeMb: 3.7 },
    ],
    ai: {
      headlines: ["केवलादेव में लौटी रौनक, प्रवासी पक्षियों का आना शुरू"],
      summary: "Migratory birds start arriving at Keoladeo National Park, Bharatpur; 40+ species expected.",
      body: "भरतपुर के केवलादेव राष्ट्रीय उद्यान में प्रवासी पक्षियों का आना शुरू हो गया है। वन विभाग के अनुसार इस बार साइबेरिया और मध्य एशिया से 40 से अधिक प्रजातियों के पक्षी आ सकते हैं।",
      category: "Civic",
      locationCode: "BRT",
      priority: "normal",
      keywords: ["KEOLADEO", "BIRDS"],
      confidence: 0.93,
      flags: [],
    },
  },
];

export const toIncomingItem = (seed: Seed) => makeItem(seed, new Date().toISOString());

export interface DeskState {
  items: IntakeItem[];
  folders: FtpFolder[];
  feed: FeedEntry[];
  runs: FetchRun[];
  activity: ActivityEntry[];
}

export function buildInitialState(): DeskState {
  const items = SEEDS.map(([seed, mins]) => makeItem(seed, minutesAgo(mins)));
  const folders: FtpFolder[] = [];
  const feed: FeedEntry[] = [];

  for (const item of items) {
    if (item.stage !== "published") continue;
    const filedAt = new Date(new Date(item.receivedAt).getTime() + 12 * 60000).toISOString();
    const folder: FtpFolder = {
      id: `fld-${item.id}`,
      itemId: item.id,
      slug: item.draft.slug,
      locationCode: item.draft.locationCode,
      date: dayOf(item.receivedAt),
      attachmentIds: item.attachments.map((a) => a.id),
      createdAt: filedAt,
    };
    item.folderId = folder.id;
    item.reviewedBy = "Desk";
    item.draft = { ...item.draft, headline: item.ai.headlines[0], body: item.ai.body };
    folders.push(folder);
    feed.push({ id: `rss-${item.id}`, itemId: item.id, folderId: folder.id, publishedAt: filedAt, live: true, pulledAt: filedAt });
  }

  const runs: FetchRun[] = [
    { id: "run-3", source: "whatsapp", at: minutesAgo(2), added: 0, titles: [] },
    { id: "run-2", source: "outlook", at: minutesAgo(2), added: 0, titles: [] },
    { id: "run-1", source: "octopus", at: minutesAgo(3), added: feed.length, titles: [] },
  ];

  const activity: ActivityEntry[] = [
    { id: "act-3", at: minutesAgo(70), text: "Rejected “Festive offer” from Brand Partnerships: advertising request", tone: "error" },
    { id: "act-2", at: minutesAgo(84), text: "Filed BKN_CAMEL_FESTIVAL and added it to the RSS feed", tone: "success" },
    { id: "act-1", at: minutesAgo(106), text: "Filed AJM_URS_TRAFFIC_PLAN and added it to the RSS feed", tone: "success" },
  ];

  return { items, folders, feed, runs, activity };
}
