import React, { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface Transaction {
  id: string;
  uid: string;
  type: 'income' | 'expense';
  amount: number;
  source: string | null;
  category: string | null;
  date: string;
  note: string | null;
  createdAt: number;
  userEmail?: string;
  userName?: string;
}

interface SwipeableTransactionItemProps {
  key?: any;
  tx: any;
  isInc: boolean;
  emoji: string;
  descText: string;
  currency: string;
  onDelete: (id: string) => any;
}

export default function SwipeableTransactionItem({
  tx,
  isInc,
  emoji,
  descText,
  currency,
  onDelete
}: SwipeableTransactionItemProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const startX = useRef(0);
  const startY = useRef(0);
  const isScrollActive = useRef<boolean | null>(null); // null = undecided, true = vertical scroll, false = horizontal swipe
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsSwiping(true);
    isScrollActive.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Decide if it's a vertical scroll or horizontal swipe
    if (isScrollActive.current === null) {
      if (Math.abs(diffY) > Math.abs(diffX)) {
        isScrollActive.current = true; // User is scrolling vertically, disable swipe
      } else {
        isScrollActive.current = false; // User is swiping horizontally
      }
    }

    if (isScrollActive.current === true) {
      return;
    }

    // Only allow swiping to the left (diffX < 0) to reveal delete button on the right
    // Cap positive to 15px (elastic bounce) and allow unlimited swipe left
    if (diffX > 0) {
      setDragOffset(Math.min(15, diffX * 0.3));
    } else {
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (isDeleting) return;

    // If swipe-left is deeper than -120px, trigger full delete animation
    if (dragOffset < -120) {
      triggerDelete();
    } else if (dragOffset < -60) {
      // Snap to revealed status (-70px)
      setDragOffset(-75);
    } else {
      // Snap back to normal
      setDragOffset(0);
    }
  };

  const triggerDelete = () => {
    setIsDeleting(true);
    setDragOffset(-500); // Fly off completely
    setTimeout(() => {
      onDelete(tx.id);
    }, 250);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
      isDeleting ? 'max-h-0 opacity-0 mb-0 pointer-events-none scale-95' : 'max-h-[100px] mb-2'
    }`}>
      {/* Background layer representing Delete option */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-end px-5 text-white gap-2 transition-opacity duration-250 rounded-xl"
        style={{
          opacity: dragOffset < 0 ? Math.min(1, Math.abs(dragOffset) / 75) : 0
        }}
      >
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <span>اسحب أكثر للحذف السريع</span>
          <Trash2 className="w-4.5 h-4.5 animate-pulse" />
        </div>
      </div>

      {/* Main Swipeable Card Wrapper */}
      <div
        ref={elementRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className="bg-white rounded-xl p-3 border border-[#e8dcc8] flex items-center justify-between shadow-xs select-none relative z-10 active:bg-gray-50/50"
      >
        <div className="flex items-center gap-3">
          {/* Category Emoji Circle */}
          <div className="w-10 h-10 rounded-lg bg-[#fef9f0] border border-[#e8dcc8] flex items-center justify-center text-lg shrink-0 pointer-events-none">
            {emoji}
          </div>
          <div className="pointer-events-none">
            <span className="text-xs font-black text-[#2c1f0e] block max-w-[180px] truncate">{descText}</span>
            <span className="text-[10px] text-[#7a6a52] block mt-0.5">
              {tx.date} · {isInc ? (tx.source || 'دخل وارد') : (tx.category || 'مصروف')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-none select-none">
          <span className={`text-xs font-black shrink-0 ${isInc ? 'text-[#0a7c6b]' : 'text-amber-600'}`}>
            {isInc ? '+' : '-'}{tx.amount.toLocaleString('ar-SA')} {currency}
          </span>
          
          {/* Guidance Indicator Chevron indicating swiping direction */}
          <span className="text-gray-300 text-xs text-center pr-1 opacity-75 font-bold transition-all">
            ‹
          </span>
        </div>
      </div>
    </div>
  );
}
