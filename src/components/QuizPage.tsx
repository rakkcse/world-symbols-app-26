import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Brain, CheckCircle2, XCircle, RefreshCcw, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { countries } from "../data/countries";
import { useNavigation } from './NavigationLayout';

interface Question {
  id: number;
  type: 'animal' | 'currency' | 'flower' | 'sport';
  country: string;
  question: string;
  correctAnswer: string;
  options: string[];
}

export default function QuizPage() {
  const { setCustomHandlers } = useNavigation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Custom navigation for quiz
  useEffect(() => {
    setCustomHandlers({
      onNext: () => {
        if (showResult) return false; // Go to Landing
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedOption(null);
          setIsCorrect(null);
          return true;
        }
        return false; // Go to Landing
      },
      onBack: () => {
        if (showResult) return false; // Go to Landing
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(prev => prev - 1);
          setSelectedOption(null);
          setIsCorrect(null);
          return true;
        }
        return false; // Go to Landing
      }
    });

    return () => setCustomHandlers(null);
  }, [currentQuestionIndex, questions.length, showResult, setCustomHandlers]);

  const generateQuiz = useCallback(() => {
    const shuffledCountries = [...countries].sort(() => 0.5 - Math.random());
    const selectedCountries = shuffledCountries.slice(0, 10);
    
    const newQuestions: Question[] = selectedCountries.map((country, index) => {
      const availableTypes: ('animal' | 'currency' | 'flower' | 'sport')[] = [];
      if (country.animals.length > 0 || (country.birds && country.birds.length > 0)) availableTypes.push('animal');
      if (country.currencies.length > 0) availableTypes.push('currency');
      if (country.flowers.length > 0) availableTypes.push('flower');
      if (country.sports.length > 0) availableTypes.push('sport');
      
      const type = availableTypes.length > 0 
        ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
        : 'currency'; // Fallback, though shouldn't happen with our data
      
      let question = "";
      let correctAnswer = "";
      let options: string[] = [];

      switch (type) {
        case 'animal':
          question = `What is the national animal of ${country.name}?`;
          correctAnswer = country.animals[0] || country.birds?.[0];
          break;
        case 'currency':
          question = `What is the national currency of ${country.name}?`;
          correctAnswer = country.currencies[0];
          break;
        case 'flower':
          question = `What is the national flower of ${country.name}?`;
          correctAnswer = country.flowers[0];
          break;
        case 'sport':
          question = `What is the national sport of ${country.name}?`;
          correctAnswer = country.sports[0];
          break;
      }

      // Generate distractors
      const distractors = countries
        .filter(c => c.name !== country.name)
        .map(c => {
          if (type === 'animal') return c.animals[0] || c.birds?.[0];
          if (type === 'currency') return c.currencies[0];
          if (type === 'flower') return c.flowers[0];
          return c.sports[0];
        })
        .filter(val => val !== correctAnswer && val !== undefined);
      
      const uniqueDistractors = Array.from(new Set(distractors)).sort(() => 0.5 - Math.random()).slice(0, 3);
      options = [correctAnswer, ...uniqueDistractors].sort(() => 0.5 - Math.random());

      return {
        id: index,
        type,
        country: country.name,
        question,
        correctAnswer,
        options
      };
    });

    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowResult(false);
    setSelectedOption(null);
    setIsCorrect(null);
  }, []);

  useEffect(() => {
    generateQuiz();
  }, [generateQuiz]);

  const handleOptionClick = (option: string) => {
    if (selectedOption) return;

    setSelectedOption(option);
    const correct = option === questions[currentQuestionIndex].correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 1);

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <header className="max-w-4xl mx-auto mb-8 md:mb-12">
        <div className="flex justify-between items-center mb-6 md:mb-8">
        </div>

        <div className="text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-2 mb-4 bg-purple-50 dark:bg-purple-900/20 rounded-full text-purple-600 dark:text-purple-400"
          >
            <Brain className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            <span className="text-[10px] md:text-sm font-semibold uppercase tracking-wider">
              Heritage Challenge
            </span>
          </motion.div>
          <h1 className="text-3xl md:text-6xl font-black tracking-tight mb-4">Heritage Quiz</h1>
          <div className="flex items-center justify-center gap-3 md:gap-4 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">
            <span>Question {currentQuestionIndex + 1} / {questions.length}</span>
            <div className="w-px h-3 md:h-4 bg-gray-200 dark:bg-gray-800"></div>
            <span>Score: {score}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-[#1a1d23] p-6 md:p-12 rounded-[32px] md:rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-xl"
            >
              <h2 className="text-xl md:text-3xl font-bold text-center mb-8 md:mb-12 leading-tight px-2">
                {currentQuestion.question}
              </h2>

              <div className="grid grid-cols-1 gap-3 md:gap-4">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOption === option;
                  const isCorrectAnswer = option === currentQuestion.correctAnswer;
                  
                  let buttonClass = "w-full p-4 md:p-6 text-left rounded-xl md:rounded-2xl border-2 font-bold transition-all flex items-center justify-between text-sm md:text-base ";
                  
                  if (!selectedOption) {
                    buttonClass += "bg-gray-50 dark:bg-gray-900/50 border-transparent hover:border-purple-200 dark:hover:border-purple-900 hover:bg-white dark:hover:bg-[#1a1d23] active:scale-[0.98]";
                  } else if (isSelected) {
                    buttonClass += isCorrect ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400";
                  } else if (isCorrectAnswer) {
                    buttonClass += "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400";
                  } else {
                    buttonClass += "bg-gray-50 dark:bg-gray-900/50 border-transparent opacity-50";
                  }

                  return (
                    <button
                      key={option}
                      disabled={!!selectedOption}
                      onClick={() => handleOptionClick(option)}
                      className={buttonClass}
                    >
                      <span className="pr-4">{option}</span>
                      {selectedOption && isCorrectAnswer && <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500 flex-shrink-0" />}
                      {selectedOption && isSelected && !isCorrect && <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#1a1d23] p-8 md:p-12 rounded-[32px] md:rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-2xl text-center"
            >
              <div className="w-16 h-16 md:w-24 md:h-24 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl md:rounded-3xl flex items-center justify-center text-yellow-500 mx-auto mb-6 md:mb-8">
                <Trophy className="w-8 h-8 md:w-12 md:h-12" />
              </div>
              <h2 className="text-2xl md:text-4xl font-black mb-4">Quiz Completed!</h2>
              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-8 md:mb-12">
                You scored <span className="text-purple-600 dark:text-purple-400 font-black">{score}</span> out of {questions.length}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                <button
                  onClick={generateQuiz}
                  className="flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-purple-600 text-white rounded-xl md:rounded-2xl font-bold shadow-lg shadow-purple-200 dark:shadow-none hover:bg-purple-700 transition-all active:scale-95 text-sm md:text-base"
                >
                  <RefreshCcw className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
