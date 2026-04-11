import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Brain, CheckCircle2, XCircle, RefreshCcw, Trophy, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { countries } from "../data/countries";
import { useNavigation } from './NavigationLayout';
import { useSound } from './SoundProvider';
import { getAssetUrl, preloadImage } from '../lib/gitUtils';
import { HeritageImage } from './HeritageImage';

import { db } from '../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

type QuizCategory = 'capitals' | 'flags' | 'currencies' | 'animals' | 'birds' | 'flowers' | 'sports' | 'random';

interface Question {
  id: number;
  type: 'capital' | 'flag' | 'currency' | 'animal' | 'bird' | 'flower' | 'sport';
  country: string;
  question: string;
  correctAnswer: string;
  options: string[];
  image?: string;
  optionsAreImages?: boolean;
}

export default function QuizPage() {
  const { setCustomHandlers } = useNavigation();
  const { playSound } = useSound();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') as QuizCategory | null;
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const setSelectedCategory = useCallback((category: QuizCategory | null) => {
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  // Custom navigation for quiz
  useEffect(() => {
    setCustomHandlers({
      onNext: () => {
        if (!selectedCategory) return false;
        if (showResult) return false;
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedOption(null);
          setIsCorrect(null);
          return true;
        }
        return false;
      },
      onBack: () => {
        if (!selectedCategory) return false;
        if (showResult) return false;
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(prev => prev - 1);
          setSelectedOption(null);
          setIsCorrect(null);
          return true;
        } else {
          setSelectedCategory(null);
          setQuestions([]);
          return true;
        }
      }
    });

    return () => setCustomHandlers(null);
  }, [currentQuestionIndex, questions.length, showResult, setCustomHandlers, selectedCategory]);

  const generateQuiz = useCallback(async (category: QuizCategory) => {
    setLoading(true);
    
    // Filter countries based on category to ensure data exists
    const filteredCountries = countries.filter(c => {
      if (category === 'capitals') return !!c.capital;
      if (category === 'currencies') return c.currencies && c.currencies.length > 0;
      if (category === 'animals') return c.animals && c.animals.length > 0;
      if (category === 'birds') return c.birds && c.birds.length > 0;
      if (category === 'flowers') return c.flowers && c.flowers.length > 0;
      if (category === 'sports') return c.sports && c.sports.length > 0;
      return true;
    });

    const shuffledCountries = [...filteredCountries].sort(() => 0.5 - Math.random());
    const selectedCountries = shuffledCountries.slice(0, 10);
    
    let flagImages: { [key: string]: string } = {};
    if (category === 'flags' || category === 'random') {
      // Use JSDelivr URLs for flags
      countries.forEach(c => {
        flagImages[c.name] = getAssetUrl('flags', c.name);
      });
    }

    const newQuestions: Question[] = selectedCountries.map((country, index) => {
      let type: 'capital' | 'flag' | 'currency' | 'animal' | 'bird' | 'flower' | 'sport';
      
      const typeMap: Record<string, 'capital' | 'flag' | 'currency' | 'animal' | 'bird' | 'flower' | 'sport'> = {
        capitals: 'capital',
        flags: 'flag',
        currencies: 'currency',
        animals: 'animal',
        birds: 'bird',
        flowers: 'flower',
        sports: 'sport'
      };

      if (category === 'random') {
        const availableTypes: ('capital' | 'flag' | 'currency' | 'animal' | 'bird' | 'flower' | 'sport')[] = [];
        if (country.capital) availableTypes.push('capital');
        if (country.currencies && country.currencies.length > 0) availableTypes.push('currency');
        if (country.animals && country.animals.length > 0) availableTypes.push('animal');
        if (country.birds && country.birds.length > 0) availableTypes.push('bird');
        if (country.flowers && country.flowers.length > 0) availableTypes.push('flower');
        if (country.sports && country.sports.length > 0) availableTypes.push('sport');
        if (flagImages[country.name]) availableTypes.push('flag');
        
        if (availableTypes.length === 0) type = 'capital'; // Fallback
        else type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      } else {
        type = typeMap[category];
      }
      
      let question = "";
      let correctAnswer = "";
      let options: string[] = [];
      let image: string | undefined;
      let optionsAreImages = false;

      // For flags, randomly choose between "Which country is this flag?" and "Which flag is for this country?"
      const flagSubtype = (type === 'flag' && flagImages[country.name]) 
        ? (Math.random() > 0.5 ? 'identify_country' : 'identify_flag')
        : null;

      switch (type) {
        case 'capital':
          question = `What is the capital city of ${country.name}?`;
          correctAnswer = country.capital;
          break;
        case 'flag':
          if (flagSubtype === 'identify_country') {
            question = `Which country does this flag belong to?`;
            correctAnswer = country.name;
            image = country.name;
          } else {
            question = `Which of these is the national flag of ${country.name}?`;
            correctAnswer = country.name;
            optionsAreImages = true;
          }
          break;
        case 'currency':
          question = `What is the national currency of ${country.name}?`;
          correctAnswer = country.currencies[0] || "Unknown";
          break;
        case 'animal':
          question = `What is the national animal of ${country.name}?`;
          correctAnswer = country.animals[0] || "Unknown";
          break;
        case 'bird':
          question = `What is the national bird of ${country.name}?`;
          correctAnswer = country.birds[0] || "Unknown";
          break;
        case 'flower':
          question = `What is the national flower of ${country.name}?`;
          correctAnswer = country.flowers[0] || "Unknown";
          break;
        case 'sport':
          question = `What is the national sport of ${country.name}?`;
          correctAnswer = country.sports[0] || "Unknown";
          break;
      }

      // Generate distractors
      const distractors = countries
        .filter(c => c.name !== country.name)
        .map(c => {
          if (type === 'capital') return c.capital;
          if (type === 'flag') return c.name;
          if (type === 'currency') return c.currencies[0];
          if (type === 'animal') return c.animals[0];
          if (type === 'bird') return c.birds[0];
          if (type === 'flower') return c.flowers[0];
          if (type === 'sport') return c.sports[0];
          return "";
        })
        .filter(val => val !== correctAnswer && val !== undefined && val !== "");
      
      const uniqueDistractors = Array.from(new Set(distractors)).sort(() => 0.5 - Math.random()).slice(0, 3);
      options = [correctAnswer, ...uniqueDistractors].sort(() => 0.5 - Math.random());

      return {
        id: index,
        type,
        country: country.name,
        question,
        correctAnswer,
        options,
        image,
        optionsAreImages
      };
    });

    // Preload all images for the quiz questions
    newQuestions.forEach(q => {
      if (q.image) preloadImage(q.image);
      if (q.optionsAreImages) {
        q.options.forEach(opt => preloadImage(opt));
      }
    });

    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowResult(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setLoading(false);
  }, []);

  // Clear questions when category is deselected
  useEffect(() => {
    if (!selectedCategory) {
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResult(false);
      setSelectedOption(null);
      setIsCorrect(null);
    }
  }, [selectedCategory]);

  // Trigger quiz generation when category changes
  useEffect(() => {
    if (selectedCategory && questions.length === 0 && !loading) {
      generateQuiz(selectedCategory);
    }
  }, [selectedCategory, questions.length, loading, generateQuiz]);

  const startQuiz = (category: QuizCategory) => {
    setSelectedCategory(category);
    generateQuiz(category);
    playSound('quiz');
  };

  // Play sound on question transition
  useEffect(() => {
    if (currentQuestionIndex > 0) {
      playSound('quiz');
    }
  }, [currentQuestionIndex, playSound]);

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

  const currentQuestion = questions[currentQuestionIndex];

  const categories: { id: QuizCategory; label: string; icon: string; color: string }[] = [
    { id: 'capitals', label: 'Capitals', icon: '🏛️', color: 'purple' },
    { id: 'flags', label: 'Flags', icon: '🚩', color: 'red' },
    { id: 'currencies', label: 'Currencies', icon: '💵', color: 'emerald' },
    { id: 'animals', label: 'Animals', icon: '🦁', color: 'blue' },
    { id: 'birds', label: 'Birds', icon: '🦜', color: 'orange' },
    { id: 'flowers', label: 'Flowers', icon: '🌸', color: 'pink' },
    { id: 'sports', label: 'Sports', icon: '🏆', color: 'teal' },
    { id: 'random', label: 'Random Mix', icon: '🎲', color: 'orange' },
  ];

  if (!selectedCategory) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <header className="max-w-4xl mx-auto mb-8 md:mb-12 text-center">
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
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs md:text-sm">
            Select a category to test your knowledge
          </p>
        </header>

        <main className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat, index) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => startQuiz(cat.id)}
              className={`p-6 md:p-8 rounded-[32px] bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center text-center group`}
            >
              <span className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform">{cat.icon}</span>
              <h3 className="text-sm md:text-lg font-black uppercase tracking-tighter">{cat.label}</h3>
              <div className={`mt-4 w-8 h-1 rounded-full bg-${cat.color}-500 opacity-20 group-hover:opacity-100 transition-opacity`}></div>
            </motion.button>
          ))}
        </main>
      </div>
    );
  }

  if (loading || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Preparing Heritage Questions...</p>
      </div>
    );
  }

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
              {selectedCategory === 'random' ? 'Random Mix Quiz' : `${selectedCategory?.charAt(0).toUpperCase()}${selectedCategory?.slice(1)} Quiz`}
            </span>
          </motion.div>
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

              {currentQuestion.image && (
                <div className="mb-8 flex justify-center">
                  <div className="w-48 h-32 md:w-64 md:h-40 rounded-2xl overflow-hidden border-4 border-gray-100 dark:border-gray-800 shadow-lg bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center">
                    <HeritageImage 
                      category={currentQuestion.type === 'flag' ? 'flags' : currentQuestion.type + 's'} 
                      countryName={currentQuestion.image} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>
              )}

              <div className={`grid ${currentQuestion.optionsAreImages ? 'grid-cols-2' : 'grid-cols-1'} gap-3 md:gap-4`}>
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedOption === option;
                  const isCorrectAnswer = option === currentQuestion.correctAnswer;
                  
                  let buttonClass = "w-full p-4 md:p-6 text-left rounded-xl md:rounded-2xl border-2 font-bold transition-all flex items-center justify-between text-sm md:text-base ";
                  
                  if (currentQuestion.optionsAreImages) {
                    buttonClass = "aspect-video p-2 rounded-xl border-2 transition-all overflow-hidden relative ";
                  }

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
                      key={`${option}-${index}`}
                      disabled={!!selectedOption}
                      onClick={() => handleOptionClick(option)}
                      className={buttonClass}
                    >
                      {currentQuestion.optionsAreImages ? (
                        <>
                          <HeritageImage 
                            category={currentQuestion.type === 'flag' ? 'flags' : currentQuestion.type + 's'} 
                            countryName={option} 
                            className="w-full h-full object-cover rounded-lg" 
                          />
                          {selectedOption && isCorrectAnswer && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                          )}
                          {selectedOption && isSelected && !isCorrect && (
                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                              <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="pr-4">{option}</span>
                          {selectedOption && isCorrectAnswer && <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500 flex-shrink-0" />}
                          {selectedOption && isSelected && !isCorrect && <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0" />}
                        </>
                      )}
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
                  onClick={() => generateQuiz(selectedCategory!)}
                  className="flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-purple-600 text-white rounded-xl md:rounded-2xl font-bold shadow-lg shadow-purple-200 dark:shadow-none hover:bg-purple-700 transition-all active:scale-95 text-sm md:text-base"
                >
                  <RefreshCcw className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setQuestions([]);
                  }}
                  className="flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl md:rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 text-sm md:text-base"
                >
                  Change Category
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
