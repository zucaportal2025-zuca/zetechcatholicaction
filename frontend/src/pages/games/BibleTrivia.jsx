import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function BibleTrivia() {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("bibleHighScore");
    return saved ? parseInt(saved) : 0;
  });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState(null);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answeredCorrect, setAnsweredCorrect] = useState(false);
  const [category, setCategory] = useState("all");

  // Bible data for question generation
  const bibleBooks = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
    "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
    "Psalms", "Proverbs", "Ecclesiastes", "Isaiah", "Jeremiah", "Ezekiel",
    "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians",
    "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
    "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
    "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
    "1 John", "2 John", "3 John", "Jude", "Revelation"
  ];

  const bibleCharacters = [
    "Adam", "Eve", "Noah", "Abraham", "Sarah", "Isaac", "Jacob", "Joseph",
    "Moses", "Aaron", "Joshua", "Deborah", "Gideon", "Samson", "Ruth",
    "Samuel", "Saul", "David", "Solomon", "Elijah", "Elisha", "Isaiah",
    "Jeremiah", "Daniel", "Jonah", "Esther", "Job", "Mary", "Joseph (NT)",
    "John the Baptist", "Jesus", "Peter", "James", "John", "Andrew",
    "Philip", "Matthew", "Thomas", "Paul", "Timothy", "Luke", "Mark"
  ];
  
  const bibleThemes = [
    "faith", "hope", "love", "grace", "mercy", "forgiveness", "obedience",
    "worship", "prayer", "humility", "patience", "kindness", "joy", "peace"
  ];

  // Pre-built questions (small but high quality)
  const preBuiltQuestions = {
    application: [
      { q: "What should you do when you feel worried?", o: ["Keep worrying", "Pray and trust God", "Ignore it", "Complain"], c: 1, s: "Philippians 4:6", e: "Do not be anxious about anything, but present your requests to God." },
      { q: "How should you treat your enemies?", o: ["Hate them", "Love and pray for them", "Avoid them", "Fight them"], c: 1, s: "Matthew 5:44", e: "Love your enemies and pray for those who persecute you." },
      { q: "What does the Bible say about forgiveness?", o: ["Forgive once", "Forgive 7 times 70", "Never forgive", "Only if asked"], c: 1, s: "Matthew 18:22", e: "Forgive not seven times, but seventy-seven times." },
      { q: "How should you treat the poor?", o: ["Ignore them", "Help generously", "Only family", "When convenient"], c: 1, s: "Proverbs 19:17", e: "Whoever is kind to the poor lends to the LORD." },
      { q: "What is the greatest commandment?", o: ["Keep Sabbath", "Love God completely", "Don't steal", "Honor parents"], c: 1, s: "Mark 12:30", e: "Love the Lord your God with all your heart." },
      { q: "What is the second greatest commandment?", o: ["Love yourself", "Love your neighbor", "Go to church", "Read Bible"], c: 1, s: "Mark 12:31", e: "Love your neighbor as yourself." },
      { q: "What should you do when you sin?", o: ["Hide it", "Confess and repent", "Blame others", "Ignore it"], c: 1, s: "1 John 1:9", e: "If we confess our sins, He is faithful to forgive us." }
    ],
    faith: [
      { q: "What is faith according to Hebrews 11:1?", o: ["Seeing is believing", "Confidence in hope", "Knowing everything", "Having proof"], c: 1, s: "Hebrews 11:1", e: "Faith is confidence in what we hope for." },
      { q: "What did Jesus say about mustard seed faith?", o: ["It's too small", "Can move mountains", "Is useless", "Only for some"], c: 1, s: "Matthew 17:20", e: "Faith as small as a mustard seed can move mountains." },
      { q: "What does 'walk by faith' mean?", o: ["See everything clearly", "Trust God not sight", "Ignore problems", "Be perfect"], c: 1, s: "2 Corinthians 5:7", e: "We live by faith, not by sight." }
    ],
    characters: [
      { q: "Who built the ark?", o: ["Moses", "Noah", "Abraham", "David"], c: 1, s: "Genesis 6:14", e: "Noah built the ark to save his family." },
      { q: "Who defeated Goliath?", o: ["Saul", "David", "Solomon", "Samson"], c: 1, s: "1 Samuel 17:50", e: "David defeated Goliath with a sling and stone." },
      { q: "Who was swallowed by a great fish?", o: ["Jonah", "Jeremiah", "Job", "Joshua"], c: 0, s: "Jonah 1:17", e: "Jonah was swallowed by a great fish." },
      { q: "Who led Israel out of Egypt?", o: ["Joshua", "Moses", "Aaron", "Joseph"], c: 1, s: "Exodus 3:10", e: "Moses led Israel out of Egypt." },
      { q: "Who was the first king of Israel?", o: ["David", "Solomon", "Saul", "Samuel"], c: 2, s: "1 Samuel 10:24", e: "Saul was the first king of Israel." }
    ]
  };

  // Generate questions on the fly (instant, no delay)
  const generateQuestions = (cat, count, diff) => {
    const generated = [];
    let availableQuestions = [];
    
    // Get questions based on category
    if (cat === "all") {
      availableQuestions = [
        ...preBuiltQuestions.application,
        ...preBuiltQuestions.faith,
        ...preBuiltQuestions.characters
      ];
    } else if (cat === "application") {
      availableQuestions = [...preBuiltQuestions.application];
    } else if (cat === "faith") {
      availableQuestions = [...preBuiltQuestions.faith];
    } else if (cat === "characters") {
      availableQuestions = [...preBuiltQuestions.characters];
    }
    
    // Take requested number of questions
    for (let i = 0; i < Math.min(count, availableQuestions.length); i++) {
      const q = availableQuestions[i % availableQuestions.length];
      generated.push({
        question: q.q,
        options: q.o,
        correct: q.c,
        scripture: q.s,
        explanation: q.e
      });
    }
    
    return generated;
  };

  // Start the game
  const startGame = (level, cat = "all") => {
    setDifficulty(level);
    setCategory(cat);
    setScore(0);
    setCurrentQuestion(0);
    setLives(3);
    setGameOver(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setLoading(false);
    
    const count = level === 'easy' ? 10 : level === 'medium' ? 15 : 20;
    const newQuestions = generateQuestions(cat, count, level);
    setQuestions(newQuestions);
    setGameStarted(true);
    setIsTimerActive(true);
  };

  // Timer effect
  useEffect(() => {
    let timer;
    if (isTimerActive && !showResult && !gameOver && timeLeft > 0 && questions.length > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !showResult && !gameOver && questions.length > 0) {
      handleAnswer(-1, true);
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft, showResult, gameOver, questions]);

  useEffect(() => {
    if (!showResult && !gameOver && gameStarted && questions.length > 0) {
      setTimeLeft(20);
      setIsTimerActive(true);
    }
  }, [currentQuestion, showResult, gameOver, gameStarted, questions]);

  const handleAnswer = (selectedIndex, isTimeout = false) => {
    if (showResult) return;
    
    setIsTimerActive(false);
    const isCorrect = !isTimeout && selectedIndex === questions[currentQuestion]?.correct;
    
    if (isCorrect) {
      setAnsweredCorrect(true);
      const points = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;
      setScore(prev => prev + points);
    } else {
      setAnsweredCorrect(false);
      setLives(prev => prev - 1);
    }
    
    setSelectedAnswer(selectedIndex);
    setShowResult(true);
    
    setTimeout(() => {
      if ((!isCorrect && lives <= 1) || (isTimeout && lives <= 1)) {
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem("bibleHighScore", score.toString());
        }
        setGameOver(true);
        setGameStarted(false);
      } else if (currentQuestion + 1 >= questions.length) {
        const finalScore = isCorrect ? score + (difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30) : score;
        if (finalScore > highScore) {
          setHighScore(finalScore);
          localStorage.setItem("bibleHighScore", finalScore.toString());
        }
        setGameOver(true);
        setGameStarted(false);
      } else {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setIsTimerActive(true);
      }
    }, 2000);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setDifficulty(null);
    setCategory("all");
    setScore(0);
    setCurrentQuestion(0);
    setLives(3);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(20);
  };

  const containerStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const categories = [
    { id: "all", name: "📖 All Topics", color: "#8b5cf6", description: "Mix of all categories" },
    { id: "application", name: "💡 Life Application", color: "#22c55e", description: "How to live as a Christian" },
    { id: "faith", name: "🙏 Faith", color: "#3b82f6", description: "Trusting and believing God" },
    { id: "characters", name: "👥 Characters", color: "#f59e0b", description: "People of the Bible" }
  ];

  if (!difficulty && !gameStarted) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: "20px", flexShrink: 0 }}>
          <button onClick={() => navigate('/games')} style={styles.backButton}>← Back</button>
          <h1 style={{ ...styles.title, color: "#1e293b" }}>📖 Bible Trivia</h1>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "5px" }}>Test your Bible knowledge!</p>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={styles.categoryContainer}>
            <h3 style={styles.categoryTitle}>📚 Select Category</h3>
            <div style={styles.categoryGrid}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    ...styles.categoryBtn,
                    background: category === cat.id ? cat.color : "#f1f5f9",
                    color: category === cat.id ? "white" : "#475569",
                    border: category === cat.id ? "none" : "1px solid #e2e8f0"
                  }}
                >
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>{cat.name.split(" ")[0]}</div>
                  <div style={{ fontSize: "11px" }}>{cat.name.split(" ").slice(1).join(" ")}</div>
                </button>
              ))}
            </div>
            <p style={styles.categoryNote}>{categories.find(c => c.id === category)?.description}</p>
          </div>
          
          <div style={styles.difficultyContainer}>
            <h3 style={styles.difficultyTitle}>⭐ Select Difficulty</h3>
            <div style={styles.difficultyButtons}>
              <button style={{...styles.difficultyBtn, background: '#22c55e'}} onClick={() => startGame('easy', category)}>
                <span>🟢</span>
                <span>Easy</span>
                <span>10 questions</span>
              </button>
              <button style={{...styles.difficultyBtn, background: '#f59e0b'}} onClick={() => startGame('medium', category)}>
                <span>🟡</span>
                <span>Medium</span>
                <span>15 questions</span>
              </button>
              <button style={{...styles.difficultyBtn, background: '#ef4444'}} onClick={() => startGame('hard', category)}>
                <span>🔴</span>
                <span>Hard</span>
                <span>20 questions</span>
              </button>
            </div>
            <p style={styles.difficultyNote}>⏱️ 20 seconds per question • ❤️ 3 lives</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    const percentage = Math.round((score / (questions.length * (difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30))) * 100) || 0;
    
    return (
      <div style={containerStyle}>
        <div style={{ padding: "20px" }}>
          <button onClick={resetGame} style={styles.backButton}>← Main Menu</button>
          <h1 style={{ ...styles.title, color: "#1e293b" }}>📖 Bible Trivia</h1>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={styles.gameOverContainer}>
            <div style={{ fontSize: "60px" }}>📊</div>
            <h2>Game Complete!</h2>
            <p style={{ fontSize: "24px", color: "#fbbf24", fontWeight: "bold" }}>Score: {score}</p>
            <p>🏆 High Score: {highScore}</p>
            <p>Accuracy: {percentage}%</p>
            <div style={styles.gameOverButtons}>
              <button onClick={() => startGame(difficulty, category)} style={styles.playAgainBtn}>Play Again</button>
              <button onClick={resetGame} style={styles.changeDifficultyBtn}>Change Settings</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const categoryInfo = categories.find(c => c.id === category);

  return (
    <div style={containerStyle}>
      <div style={{ padding: "15px 20px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <button onClick={resetGame} style={styles.backButton}>← Quit</button>
          <h1 style={{ ...styles.title, color: "#1e293b", margin: 0 }}>📖 Bible Trivia</h1>
          <div style={styles.livesContainer}>
            {[...Array(lives)].map((_, i) => <span key={i} style={{ fontSize: "20px" }}>❤️</span>)}
          </div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "15px" }}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Score</span>
            <span style={styles.statValue}>{score}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Question</span>
            <span style={styles.statValue}>{currentQuestion + 1}/{questions.length}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Time</span>
            <span style={{...styles.statValue, color: timeLeft <= 5 ? '#ef4444' : '#fbbf24'}}>{timeLeft}s</span>
          </div>
        </div>
        
        <div style={styles.progressBar}>
          <div style={{...styles.progressFill, width: `${progress}%`}} />
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <div style={styles.questionContainer}>
          <div style={styles.difficultyBadge}>
            {categoryInfo?.name || "Bible"} • {difficulty === 'easy' ? '🟢 EASY' : difficulty === 'medium' ? '🟡 MEDIUM' : '🔴 HARD'}
          </div>
          <h2 style={styles.questionText}>{currentQ?.question}</h2>
          
          <div style={styles.optionsContainer}>
            {currentQ?.options.map((option, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(idx)}
                disabled={showResult}
                style={{
                  ...styles.optionBtn,
                  ...(showResult && idx === currentQ.correct && styles.correctOption),
                  ...(showResult && selectedAnswer === idx && idx !== currentQ.correct && styles.wrongOption),
                }}
              >
                <span style={styles.optionLetter}>{String.fromCharCode(65 + idx)}.</span>
                <span style={styles.optionText}>{option}</span>
                {showResult && idx === currentQ.correct && <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>}
              </motion.button>
            ))}
          </div>
          
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  ...styles.resultContainer,
                  backgroundColor: answeredCorrect ? '#22c55e20' : '#ef444420',
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  {answeredCorrect ? '✓ Correct!' : `✗ Wrong!`}
                </div>
                <p style={{ fontSize: "14px", color: "#475569" }}>{currentQ?.explanation}</p>
                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", marginTop: "8px" }}>
                  📖 {currentQ?.scripture}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backButton: {
    padding: "8px 16px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "40px",
    fontSize: "14px",
    color: "#475569",
    fontWeight: "500",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
  },
  livesContainer: {
    display: "flex",
    gap: "5px",
  },
  statBox: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "8px 20px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
  },
  statLabel: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#f59e0b",
    display: "block",
  },
  progressBar: {
    width: "100%",
    height: "4px",
    background: "#e2e8f0",
    borderRadius: "2px",
    marginTop: "15px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#10b981",
    transition: "width 0.3s ease",
  },
  questionContainer: {
    background: "white",
    borderRadius: "24px",
    padding: "25px",
    maxWidth: "700px",
    margin: "0 auto",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    border: "1px solid #e2e8f0",
  },
  difficultyBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
    background: "#f3f4f6",
    color: "#4b5563",
    marginBottom: "20px",
  },
  questionText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "25px",
    lineHeight: 1.4,
  },
  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px",
  },
  optionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "14px 18px",
    background: "#f8fafc",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
  },
  correctOption: {
    background: "#d1fae5",
    borderColor: "#10b981",
  },
  wrongOption: {
    background: "#fee2e2",
    borderColor: "#ef4444",
  },
  optionLetter: {
    fontWeight: "700",
    color: "#64748b",
    minWidth: "30px",
  },
  optionText: {
    flex: 1,
    fontSize: "14px",
    color: "#1e293b",
  },
  resultContainer: {
    marginTop: "20px",
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid",
    textAlign: "center",
  },
  categoryContainer: {
    textAlign: "center",
    background: "white",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  categoryTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "15px",
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gap: "10px",
  },
  categoryBtn: {
    padding: "10px 8px",
    fontSize: "11px",
    fontWeight: "500",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center",
  },
  categoryNote: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "12px",
    fontStyle: "italic",
  },
  difficultyContainer: {
    textAlign: "center",
    background: "white",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  difficultyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "15px",
  },
  difficultyButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  difficultyBtn: {
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  difficultyNote: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "15px",
  },
  gameOverContainer: {
    textAlign: "center",
    background: "white",
    borderRadius: "24px",
    padding: "40px",
    maxWidth: "400px",
    margin: "0 auto",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    border: "1px solid #e2e8f0",
  },
  gameOverButtons: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginTop: "20px",
  },
  playAgainBtn: {
    padding: "10px 20px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "40px",
    cursor: "pointer",
    fontWeight: "600",
  },
  changeDifficultyBtn: {
    padding: "10px 20px",
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: "40px",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default BibleTrivia;