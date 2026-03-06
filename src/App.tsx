/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  User, 
  Cpu, 
  ChevronRight, 
  Layers,
  Heart,
  Diamond,
  Club,
  Spade
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types & Constants ---

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const SUIT_ICONS = {
  hearts: <Heart className="w-4 h-4 text-red-500 fill-red-500" />,
  diamonds: <Diamond className="w-4 h-4 text-red-500 fill-red-500" />,
  clubs: <Club className="w-4 h-4 text-slate-800 fill-slate-800" />,
  spades: <Spade className="w-4 h-4 text-slate-800 fill-slate-800" />,
};

const SUIT_COLORS = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-slate-900',
  spades: 'text-slate-900',
};

// --- Helper Functions ---

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ id: `${rank}-${suit}`, suit, rank });
    });
  });
  return deck;
};

const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// --- Components ---

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  isHidden?: boolean;
  isPlayable?: boolean;
  className?: string;
  key?: React.Key;
}

const CardView = ({ card, onClick, isHidden = false, isPlayable = false, className = "" }: CardViewProps) => {
  if (isHidden) {
    return (
      <motion.div 
        layoutId={card.id}
        className={`w-16 h-24 sm:w-24 sm:h-36 bg-indigo-600 rounded-lg border-2 border-white shadow-lg flex items-center justify-center relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <Layers className="w-8 h-8 text-white opacity-50" />
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={card.id}
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        w-16 h-24 sm:w-24 sm:h-36 bg-white rounded-lg border-2 border-slate-200 shadow-md flex flex-col p-1 sm:p-2 cursor-pointer relative
        ${isPlayable ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}
        ${className}
      `}
    >
      <div className={`flex justify-between items-start ${SUIT_COLORS[card.suit]}`}>
        <span className="text-xs sm:text-lg font-bold leading-none">{card.rank}</span>
        {SUIT_ICONS[card.suit]}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className={`text-2xl sm:text-4xl font-bold ${SUIT_COLORS[card.suit]}`}>
          {card.rank === '8' ? '★' : card.rank}
        </span>
      </div>
      <div className={`flex justify-between items-end rotate-180 ${SUIT_COLORS[card.suit]}`}>
        <span className="text-xs sm:text-lg font-bold leading-none">{card.rank}</span>
        {SUIT_ICONS[card.suit]}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'ai'>('player');
  const [wildSuit, setWildSuit] = useState<Suit | null>(null);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'gameOver'>('waiting');
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [message, setMessage] = useState<string>("Welcome to Tina Crazy Eights!");

  const topCard = discardPile[discardPile.length - 1];

  // Initialize Game
  const initGame = useCallback(() => {
    const fullDeck = shuffle(createDeck());
    const pHand = fullDeck.splice(0, 8);
    const aHand = fullDeck.splice(0, 8);
    
    // Ensure first discard is not an 8
    let firstDiscardIndex = 0;
    while (fullDeck[firstDiscardIndex].rank === '8') {
      firstDiscardIndex++;
    }
    const firstDiscard = fullDeck.splice(firstDiscardIndex, 1)[0];

    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([firstDiscard]);
    setDeck(fullDeck);
    setCurrentTurn('player');
    setWildSuit(null);
    setGameState('playing');
    setWinner(null);
    setMessage("Your turn! Match the suit or rank.");
  }, []);

  // Check if a card is playable
  const isCardPlayable = useCallback((card: Card) => {
    if (!topCard) return false;
    if (card.rank === '8') return true;
    if (wildSuit) return card.suit === wildSuit;
    return card.suit === topCard.suit || card.rank === topCard.rank;
  }, [topCard, wildSuit]);

  // Handle Player Move
  const playCard = (card: Card, isPlayer: boolean) => {
    if (isPlayer) {
      if (card.rank === '8') {
        setPlayerHand(prev => prev.filter(c => c.id !== card.id));
        setDiscardPile(prev => [...prev, card]);
        setShowSuitPicker(true);
        setWildSuit(null);
      } else {
        setPlayerHand(prev => prev.filter(c => c.id !== card.id));
        setDiscardPile(prev => [...prev, card]);
        setWildSuit(null);
        checkWin('player', playerHand.length - 1);
        setCurrentTurn('ai');
      }
    } else {
      // AI Move
      setAiHand(prev => prev.filter(c => c.id !== card.id));
      setDiscardPile(prev => [...prev, card]);
      if (card.rank === '8') {
        const suits = SUITS;
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        setWildSuit(randomSuit);
        setMessage(`AI played an 8 and chose ${randomSuit}!`);
      } else {
        setWildSuit(null);
        setMessage("AI played a card. Your turn!");
      }
      checkWin('ai', aiHand.length - 1);
      setCurrentTurn('player');
    }
  };

  const drawCard = (isPlayer: boolean) => {
    if (deck.length === 0) {
      setMessage("Deck is empty! Turn skipped.");
      setCurrentTurn(isPlayer ? 'ai' : 'player');
      return;
    }

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    setDeck(newDeck);

    if (isPlayer) {
      setPlayerHand(prev => [...prev, card]);
      setMessage("You drew a card.");
      setCurrentTurn('ai');
    } else {
      setAiHand(prev => [...prev, card]);
      setMessage("AI drew a card.");
      setCurrentTurn('player');
    }
  };

  const checkWin = (who: 'player' | 'ai', count: number) => {
    if (count === 0) {
      setGameState('gameOver');
      setWinner(who);
      if (who === 'player') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  // AI Logic
  useEffect(() => {
    if (currentTurn === 'ai' && gameState === 'playing') {
      const timer = setTimeout(() => {
        const playableCards = aiHand.filter(isCardPlayable);
        if (playableCards.length > 0) {
          // AI Strategy: Prefer non-8s
          const nonEight = playableCards.find(c => c.rank !== '8');
          playCard(nonEight || playableCards[0], false);
        } else {
          drawCard(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, aiHand, isCardPlayable, gameState]);

  const handleSuitPick = (suit: Suit) => {
    setWildSuit(suit);
    setShowSuitPicker(false);
    setMessage(`You chose ${suit}! AI's turn.`);
    checkWin('player', playerHand.length);
    setCurrentTurn('ai');
  };

  return (
    <div className="min-h-screen bg-emerald-900 text-white font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold">8</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">Tina Crazy Eights</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium">{deck.length}</span>
          </div>
          <button 
            onClick={initGame}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Restart Game"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative flex flex-col p-4 gap-8 overflow-hidden">
        
        {/* AI Hand */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest font-semibold">
            <Cpu className="w-3 h-3" />
            AI Opponent ({aiHand.length})
          </div>
          <div className="flex -space-x-8 sm:-space-x-12 overflow-visible py-4">
            {aiHand.map((card) => (
              <CardView key={card.id} card={card} isHidden className="scale-90 sm:scale-100" />
            ))}
          </div>
        </div>

        {/* Center: Deck & Discard */}
        <div className="flex-1 flex items-center justify-center gap-8 sm:gap-16">
          {/* Draw Pile */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-indigo-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div 
              onClick={() => currentTurn === 'player' && drawCard(true)}
              className={`
                w-16 h-24 sm:w-24 sm:h-36 bg-indigo-700 rounded-lg border-2 border-white/30 shadow-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-95
                ${currentTurn === 'player' ? 'hover:-translate-y-1' : 'opacity-50 cursor-not-allowed'}
              `}
            >
              <Layers className="w-8 h-8 text-white/50" />
              {deck.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-indigo-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/20">
                  {deck.length}
                </div>
              )}
            </div>
            <p className="text-[10px] text-center mt-2 text-white/40 uppercase tracking-tighter">Draw Pile</p>
          </div>

          {/* Discard Pile */}
          <div className="relative">
            <AnimatePresence mode="popLayout">
              {topCard && (
                <CardView 
                  key={topCard.id} 
                  card={topCard} 
                  className="shadow-2xl ring-4 ring-white/10"
                />
              )}
            </AnimatePresence>
            {wildSuit && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-4 -right-4 bg-white text-slate-900 p-2 rounded-full shadow-xl border-2 border-indigo-500 flex items-center justify-center"
              >
                {SUIT_ICONS[wildSuit]}
              </motion.div>
            )}
            <p className="text-[10px] text-center mt-2 text-white/40 uppercase tracking-tighter">Discard Pile</p>
          </div>
        </div>

        {/* Message Banner */}
        <div className="flex justify-center">
          <motion.div 
            key={message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 backdrop-blur-sm px-6 py-2 rounded-full border border-white/10 text-sm font-medium flex items-center gap-2"
          >
            {currentTurn === 'player' ? <User className="w-4 h-4 text-indigo-400" /> : <Cpu className="w-4 h-4 text-red-400" />}
            {message}
          </motion.div>
        </div>

        {/* Player Hand */}
        <div className="flex flex-col items-center gap-4 pb-8">
          <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest font-semibold">
            <User className="w-3 h-3" />
            Your Hand ({playerHand.length})
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-4xl px-4">
            <AnimatePresence>
              {playerHand.map((card) => (
                <CardView 
                  key={card.id} 
                  card={card} 
                  isPlayable={currentTurn === 'player' && isCardPlayable(card)}
                  onClick={() => playCard(card, true)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Overlays */}
      
      {/* Start Screen */}
      {gameState === 'waiting' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full bg-slate-900 rounded-3xl p-8 border border-white/10 shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-indigo-500/20 shadow-2xl rotate-12">
              <span className="text-4xl font-black italic">8</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Tina Crazy Eights</h2>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              Match the suit or rank. Eights are wild! Be the first to empty your hand to win.
            </p>
            <button 
              onClick={initGame}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group"
            >
              Start Game
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      )}

      {/* Suit Picker */}
      {showSuitPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 text-slate-900 shadow-2xl max-w-sm w-full text-center"
          >
            <h3 className="text-xl font-bold mb-6">Choose a Suit</h3>
            <div className="grid grid-cols-2 gap-4">
              {SUITS.map(suit => (
                <button
                  key={suit}
                  onClick={() => handleSuitPick(suit)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                >
                  <div className="scale-150 group-hover:scale-175 transition-transform">
                    {SUIT_ICONS[suit]}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{suit}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameOver' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full bg-slate-900 rounded-3xl p-10 border border-white/10 shadow-2xl text-center"
          >
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl ${winner === 'player' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-slate-700 shadow-slate-700/20'}`}>
              <Trophy className={`w-12 h-12 ${winner === 'player' ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <h2 className="text-4xl font-black mb-2 uppercase italic tracking-tighter">
              {winner === 'player' ? 'Victory!' : 'Defeat'}
            </h2>
            <p className="text-slate-400 mb-10">
              {winner === 'player' ? "You've outplayed the AI!" : "The AI was just a bit faster this time."}
            </p>
            <button 
              onClick={initGame}
              className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </button>
          </motion.div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="p-4 text-center text-[10px] text-white/20 uppercase tracking-[0.2em] font-medium">
        Standard 52 Card Deck • No Jokers • 8s Are Wild
      </footer>
    </div>
  );
}
