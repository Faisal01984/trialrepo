// Smart Topic Suggestion curriculum.
// When a teacher picks one of the subjects below + a level, the topic field
// auto-populates with these curated topics instead of requiring manual typing.

export const SUBJECT_CURRICULUM = {
  AI: {
    Beginner: [
      "What is Artificial Intelligence?",
      "History of AI",
      "How Computers Learn",
      "Introduction to Machine Learning",
      "What is a Neural Network?",
      "AI in Everyday Life",
      "Introduction to Chatbots",
      "What is Data?",
      "Supervised vs Unsupervised Learning",
      "AI Ethics and Safety Basics",
    ],
    Intermediate: [
      "Machine Learning Algorithms",
      "Decision Trees and Random Forests",
      "Natural Language Processing (NLP)",
      "Computer Vision Basics",
      "Training and Testing Models",
      "Overfitting and Underfitting",
      "Feature Engineering",
      "Introduction to Deep Learning",
      "AI Model Evaluation Metrics",
      "Real-world AI Applications",
    ],
    Advanced: [
      "Transformer Architecture",
      "Large Language Models (LLMs)",
      "Generative AI and Diffusion Models",
      "Reinforcement Learning",
      "Fine-tuning Pretrained Models",
      "Prompt Engineering",
      "AI Agents and Tool Use",
      "Multimodal AI Systems",
      "AI in Production and MLOps",
      "Responsible AI and Governance",
    ],
    "AI Class": [
      "Building Your First Chatbot",
      "Hands-on with Python for AI",
      "Using Hugging Face Models",
      "Creating Image Classifiers",
      "AI Project: Text Summarizer",
      "AI Project: Sentiment Analyzer",
      "Deploying AI Apps with Streamlit",
      "Working with OpenAI API",
      "Building a RAG Application",
      "AI Capstone Project",
    ],
  },
  Python: {
    Beginner: [
      "What is Python?",
      "Installing Python and VS Code",
      "Variables and Data Types",
      "Taking User Input",
      "If/Else Conditions",
      "Loops: For and While",
      "Functions Basics",
      "Lists and Tuples",
      "Dictionaries and Sets",
      "Simple Calculator Project",
    ],
    Intermediate: [
      "Object Oriented Programming (OOP)",
      "File Handling in Python",
      "Error and Exception Handling",
      "Modules and Packages",
      "Working with APIs",
      "Regular Expressions",
      "List Comprehensions",
      "Lambda Functions",
      "Working with JSON",
      "Python Virtual Environments",
    ],
    Advanced: [
      "Decorators and Generators",
      "Multithreading and Multiprocessing",
      "Async Programming in Python",
      "Design Patterns in Python",
      "Memory Management",
      "Building REST APIs with FastAPI",
      "Web Scraping with BeautifulSoup",
      "Python for Data Science (Pandas/NumPy)",
      "Testing with PyTest",
      "Packaging and Publishing Python Libraries",
    ],
    "AI Class": [
      "Python for AI: Setup and Basics",
      "NumPy for Numerical Computing",
      "Pandas for Data Analysis",
      "Matplotlib for Data Visualization",
      "Scikit-learn: Your First ML Model",
      "Building a Spam Classifier",
      "Python + OpenAI API Integration",
      "Automating Tasks with Python",
      "Python Web App with Streamlit",
      "End-to-End AI Project in Python",
    ],
  },
  "Web Development": {
    Beginner: [
      "What is the Internet?",
      "How Websites Work",
      "Introduction to HTML",
      "HTML Tags and Structure",
      "Introduction to CSS",
      "Styling with Colors and Fonts",
      "CSS Box Model",
      "Building Your First Webpage",
      "Introduction to JavaScript",
      "Making a Button Click Event",
    ],
    Intermediate: [
      "Responsive Design with Flexbox",
      "CSS Grid Layout",
      "JavaScript DOM Manipulation",
      "Forms and Validation",
      "Introduction to React",
      "React Components and Props",
      "State Management in React",
      "Fetching Data from APIs",
      "Introduction to Node.js",
      "Building a Simple REST API",
    ],
    Advanced: [
      "Next.js and Server Side Rendering",
      "Authentication with JWT",
      "Database Integration (Supabase/Firebase)",
      "TypeScript for Web Dev",
      "Testing React Apps",
      "Web Performance Optimization",
      "Progressive Web Apps (PWA)",
      "CI/CD for Web Projects",
      "Deploying on Vercel/Netlify",
      "Full Stack Project: Build and Deploy",
    ],
    "AI Class": [
      "Adding AI Chatbot to a Website",
      "Building an AI Image Generator App",
      "Integrating OpenAI API in React",
      "AI-Powered Search Feature",
      "Voice Assistant Web App",
      "AI Form Auto-Fill Feature",
      "Sentiment Analysis Web Dashboard",
      "Real-time AI Suggestions UI",
      "AI PathShala Clone Project",
      "Deploy Your AI Web App",
    ],
  },
  Robotics: {
    Beginner: [
      "What is a Robot?",
      "History of Robotics",
      "Parts of a Robot",
      "Introduction to Arduino",
      "Sensors and Actuators",
      "Making an LED Blink",
      "Simple Motor Control",
      "Line Following Robot Basics",
      "Introduction to Raspberry Pi",
      "Safety in Robotics",
    ],
    Intermediate: [
      "Robot Movement and Control",
      "Ultrasonic Sensors",
      "Infrared Sensors",
      "Servo Motor Programming",
      "Bluetooth Controlled Robot",
      "Introduction to ROS",
      "Computer Vision for Robots",
      "Robot Arm Programming",
      "Path Planning Algorithms",
      "Obstacle Avoidance Systems",
    ],
    Advanced: [
      "SLAM (Simultaneous Localization and Mapping)",
      "Autonomous Navigation",
      "Deep Learning for Robotics",
      "Reinforcement Learning in Robots",
      "Human-Robot Interaction",
      "Swarm Robotics",
      "ROS2 Advanced Topics",
      "Robotic Process Automation (RPA)",
      "Industrial Robotics",
      "Robotics Capstone Project",
    ],
    "AI Class": [
      "AI-Powered Object Detection Robot",
      "Voice Controlled Robot with Python",
      "Gesture Recognition Robot",
      "Face Tracking Robot",
      "Autonomous Delivery Bot Project",
      "AI Arm: Pick and Place",
      "Robot with ChatGPT Integration",
      "Self-Balancing Robot",
      "AI Drone Programming Basics",
      "Robotics + AI Final Project",
    ],
  },
  "Data Science": {
    Beginner: [
      "What is Data Science?",
      "Types of Data",
      "Introduction to Statistics",
      "Mean, Median, Mode",
      "Data Collection Methods",
      "Introduction to Excel for Data",
      "Data Cleaning Basics",
      "What is a Dataset?",
      "Simple Charts and Graphs",
      "Introduction to Google Colab",
    ],
    Intermediate: [
      "Exploratory Data Analysis (EDA)",
      "Data Visualization with Matplotlib",
      "Seaborn for Statistical Plots",
      "Hypothesis Testing",
      "Correlation and Regression",
      "Feature Selection",
      "Working with Real Datasets",
      "SQL for Data Science",
      "Introduction to Tableau",
      "Data Storytelling",
    ],
    Advanced: [
      "Advanced Statistical Modeling",
      "Time Series Analysis",
      "Big Data with PySpark",
      "Data Pipelines and ETL",
      "A/B Testing",
      "Dimensionality Reduction (PCA)",
      "Clustering Algorithms",
      "Building a Data Dashboard",
      "Machine Learning for Data Science",
      "Data Science Capstone Project",
    ],
    "AI Class": [
      "AI-Powered Data Analysis",
      "Predicting with Regression Models",
      "Customer Segmentation with ML",
      "Fraud Detection Model",
      "Recommendation System",
      "Sales Forecasting Project",
      "NLP on Real Data",
      "Image Data Analysis",
      "AutoML Tools",
      "End-to-End Data Science Project",
    ],
  },
  Cybersecurity: {
    Beginner: [
      "What is Cybersecurity?",
      "Types of Cyber Threats",
      "Password Safety",
      "Phishing Awareness",
      "Safe Internet Browsing",
      "Two-Factor Authentication",
      "What is Encryption?",
      "Social Engineering Basics",
      "Device Security Tips",
      "Introduction to VPNs",
    ],
    Intermediate: [
      "Network Security Basics",
      "Firewalls and Intrusion Detection",
      "Linux for Security",
      "Introduction to Ethical Hacking",
      "Web Application Vulnerabilities",
      "OWASP Top 10",
      "Cryptography Fundamentals",
      "Malware Analysis Basics",
      "Security Auditing",
      "Introduction to CTF Challenges",
    ],
    Advanced: [
      "Penetration Testing",
      "Exploit Development",
      "Reverse Engineering",
      "Advanced Network Forensics",
      "Cloud Security",
      "Zero Trust Architecture",
      "Red Team vs Blue Team",
      "Incident Response",
      "Security Operations Center (SOC)",
      "AI in Cybersecurity",
    ],
    "AI Class": [
      "AI for Threat Detection",
      "Using AI to Detect Phishing",
      "Anomaly Detection with ML",
      "AI-Powered SIEM Systems",
      "Deepfake Awareness and Detection",
      "Automating Security with Python",
      "AI Vulnerability Scanners",
      "ChatGPT for Security Research",
      "Building a Security Chatbot",
      "AI Cybersecurity Capstone",
    ],
  },
} as const;

export type CurriculumSubject = keyof typeof SUBJECT_CURRICULUM;
export type CurriculumLevel = "Beginner" | "Intermediate" | "Advanced" | "AI Class";

export const CURRICULUM_SUBJECTS = Object.keys(SUBJECT_CURRICULUM) as CurriculumSubject[];
export const CURRICULUM_LEVELS: CurriculumLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "AI Class",
];

export function isCurriculumSubject(s: string): s is CurriculumSubject {
  return (CURRICULUM_SUBJECTS as readonly string[]).includes(s);
}

export function isCurriculumLevel(l: string): l is CurriculumLevel {
  return (CURRICULUM_LEVELS as readonly string[]).includes(l);
}

export function getSuggestedTopics(
  subject: string,
  level: string,
): readonly string[] | null {
  if (!isCurriculumSubject(subject)) return null;
  if (!isCurriculumLevel(level)) return null;
  return SUBJECT_CURRICULUM[subject][level];
}

// Tailwind classes for the colored level badge shown above the topic grid.
export function levelBadgeClass(level: string): string {
  switch (level) {
    case "Beginner":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800";
    case "Intermediate":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800";
    case "Advanced":
      return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-800";
    case "AI Class":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800";
    default:
      return "bg-secondary text-secondary-foreground border-border";
  }
}
