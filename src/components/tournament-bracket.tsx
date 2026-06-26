'use client';

import React, { useState } from 'react';
import { Match, Prediction } from '@/types';
import BracketCard from './bracket-card';
import { Filter } from 'lucide-react';

interface TournamentBracketProps {
  matches: Match[];
  predictions: Prediction[];
  isLoggedIn: boolean;
  isAdmin?: boolean;
  onPredictClick: (match: Match) => void;
}

// 1. Component con hiển thị cụm 2 trận R32 và connector chữ U
interface Vong32SlotsProps {
  vong32Slots: (Match | null)[];
  predictionMap: Map<number, Prediction>;
  onPredictClick: (match: Match) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  selectedBracketStage: string;
  vong16Index: number;
}

function Vong32Slots({
  vong32Slots,
  predictionMap,
  onPredictClick,
  isLoggedIn,
  isAdmin,
  selectedBracketStage,
  vong16Index
}: Vong32SlotsProps) {
  const r32Configs: Record<number, { home: string; away: string }> = {
    1: { home: "Germany", away: "3rd Group A/B/C/D/F" },
    2: { home: "Winner Group I", away: "3rd C/D/F/G/H" },
    3: { home: "Runner-up Group A", away: "Runner-up Group B" },
    4: { home: "Winner Group F", away: "Runner-up Group C" },
    5: { home: "Runner-up Group K", away: "Runner-up Group L" },
    6: { home: "Winner Group H", away: "Runner-up Group J" },
    7: { home: "United States", away: "3rd B/E/F/I/J" },
    8: { home: "Winner Group G", away: "3rd A/E/H/I/J" },
    9: { home: "Winner Group C", away: "Runner-up Group F" },
    10: { home: "Runner-up Group E", away: "Runner-up Group I" },
    11: { home: "Mexico", away: "3rd C/E/F/H/I" },
    12: { home: "Winner Group L", away: "3rd E/H/I/J/K" },
    13: { home: "Winner Group J", away: "Runner-up Group H" },
    14: { home: "Runner-up Group D", away: "Runner-up Group G" },
    15: { home: "Winner Group B", away: "3rd E/F/G/I/J" },
    16: { home: "Winner Group K", away: "3rd D/E/I/J/L" }
  };

  const r32Idx1 = vong16Index * 2 - 1;
  const r32Idx2 = vong16Index * 2;
  const config1 = r32Configs[r32Idx1];
  const config2 = r32Configs[r32Idx2];

  return (
    <div
      className={`flex flex-col relative pr-8 flex-shrink-0 ${selectedBracketStage === 'vong32' ? 'gap-6' : 'gap-2'
        }`}
      id={vong16Index === 1 ? "col-vong32" : undefined}
    >
      <BracketCard
        match={vong32Slots[0]}
        userPrediction={vong32Slots[0] ? predictionMap.get(vong32Slots[0].id) : undefined}
        onPredictClick={onPredictClick}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        placeholderHome={config1.home}
        placeholderAway={config1.away}
        matchIndexInfo={`Trận 1/32 (${r32Idx1})`}
      />
      <BracketCard
        match={vong32Slots[1]}
        userPrediction={vong32Slots[1] ? predictionMap.get(vong32Slots[1].id) : undefined}
        onPredictClick={onPredictClick}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        placeholderHome={config2.home}
        placeholderAway={config2.away}
        matchIndexInfo={`Trận 1/32 (${r32Idx2})`}
      />
      <div className="absolute right-0 top-[60px] bottom-[60px] w-8 border-r border-y border-white/10 rounded-r" />
    </div>
  );
}

// 2. Component con hiển thị nhánh Vòng 1/16
interface Vong16BranchProps {
  match: Match | null;
  predictionMap: Map<number, Prediction>;
  onPredictClick: (match: Match) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  selectedBracketStage: string;
  showVong16: boolean;
  showVong32: boolean;
  showTuket: boolean;
  vong32Slots: (Match | null)[];
  vong16Index: number;
}

function Vong16Branch({
  match,
  predictionMap,
  onPredictClick,
  isLoggedIn,
  isAdmin,
  selectedBracketStage,
  showVong16,
  showVong32,
  showTuket,
  vong32Slots,
  vong16Index
}: Vong16BranchProps) {
  const r16Configs: Record<number, { home: string; away: string }> = {
    1: { home: "Thắng Trận 74", away: "Thắng Trận 77" },
    2: { home: "Thắng Trận 73", away: "Thắng Trận 75" },
    3: { home: "Thắng Trận 83", away: "Thắng Trận 84" },
    4: { home: "Thắng Trận 81", away: "Thắng Trận 82" },
    5: { home: "Thắng Trận 76", away: "Thắng Trận 78" },
    6: { home: "Thắng Trận 79", away: "Thắng Trận 80" },
    7: { home: "Thắng Trận 86", away: "Thắng Trận 88" },
    8: { home: "Thắng Trận 85", away: "Thắng Trận 87" }
  };

  const config = r16Configs[vong16Index];

  return (
    <div className="flex items-center">
      {(showVong16 || showVong32) && (
        <div className="flex items-center">
          {showVong32 && (
            <Vong32Slots
              vong32Slots={vong32Slots}
              predictionMap={predictionMap}
              onPredictClick={onPredictClick}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              selectedBracketStage={selectedBracketStage}
              vong16Index={vong16Index}
            />
          )}
          {showVong32 && showVong16 && <div className="w-8 h-px bg-white/10 flex-shrink-0" />}

          {showVong16 && (
            <div className="flex items-center">
              <BracketCard
                match={match}
                userPrediction={match ? predictionMap.get(match.id) : undefined}
                onPredictClick={onPredictClick}
                isLoggedIn={isLoggedIn}
                isAdmin={isAdmin}
                placeholderHome={config.home}
                placeholderAway={config.away}
                matchIndexInfo={`Trận 1/16 (${vong16Index})`}
              />
              {showTuket && <div className="w-8 h-px bg-white/10 flex-shrink-0" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 3. Component con hiển thị nhánh Tứ kết
interface QuarterfinalBranchProps {
  match: Match | null;
  predictionMap: Map<number, Prediction>;
  onPredictClick: (match: Match) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  selectedBracketStage: string;
  showBanket: boolean;
  showTuket: boolean;
  showVong16: boolean;
  showVong32: boolean;
  vong16Slots: (Match | null)[];
  vong32Slots: (Match | null)[];
  branchIndex: number;
}

function QuarterfinalBranch({
  match,
  predictionMap,
  onPredictClick,
  isLoggedIn,
  isAdmin,
  selectedBracketStage,
  showBanket,
  showTuket,
  showVong16,
  showVong32,
  vong16Slots,
  vong32Slots,
  branchIndex
}: QuarterfinalBranchProps) {
  return (
    <div className="flex items-center">
      {(showTuket || showVong16 || showVong32) && (
        <div className="flex items-center">
          <div
            className={`flex flex-col relative pr-8 flex-shrink-0 transition-all duration-500 ${selectedBracketStage === 'all'
              ? 'gap-12'
              : selectedBracketStage === 'vong32'
                ? 'gap-8'
                : 'gap-2'
              }`}
            id={branchIndex === 1 ? "col-vong16" : branchIndex === 3 ? "col-vong16-lower" : undefined}
          >
            <Vong16Branch
              match={vong16Slots[0]}
              predictionMap={predictionMap}
              onPredictClick={onPredictClick}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              selectedBracketStage={selectedBracketStage}
              showVong16={showVong16}
              showVong32={showVong32}
              showTuket={showTuket}
              vong32Slots={[vong32Slots[0], vong32Slots[1]]}
              vong16Index={branchIndex * 2 - 1}
            />
            <Vong16Branch
              match={vong16Slots[1]}
              predictionMap={predictionMap}
              onPredictClick={onPredictClick}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              selectedBracketStage={selectedBracketStage}
              showVong16={showVong16}
              showVong32={showVong32}
              showTuket={showTuket}
              vong32Slots={[vong32Slots[2], vong32Slots[3]]}
              vong16Index={branchIndex * 2}
            />
            {showVong16 && showTuket && (
              <div className={`absolute right-0 w-8 border-r border-y border-white/10 rounded-r ${selectedBracketStage === 'all'
                ? 'connector-r16-qf-all-v32'
                : 'connector-r16-qf-v16'
                }`} />
            )}
          </div>
          <div className="w-8 h-px bg-white/10 flex-shrink-0" />
        </div>
      )}

      {showTuket && (
        <div className="flex items-center">
          <BracketCard
            match={match}
            userPrediction={match ? predictionMap.get(match.id) : undefined}
            onPredictClick={onPredictClick}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            placeholderHome={`Thắng Trận 1/16 (${branchIndex * 2 - 1})`}
            placeholderAway={`Thắng Trận 1/16 (${branchIndex * 2})`}
            matchIndexInfo={`Tứ kết ${branchIndex}`}
          />
          {showBanket && <div className="w-8 h-px bg-white/10 flex-shrink-0" />}
        </div>
      )}
    </div>
  );
}

// 4. Component con hiển thị cụm Bán kết
interface SemifinalBranchProps {
  match: Match | null;
  predictionMap: Map<number, Prediction>;
  onPredictClick: (match: Match) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  selectedBracketStage: string;
  showBanket: boolean;
  showTuket: boolean;
  showVong16: boolean;
  showVong32: boolean;
  tuKetSlots: (Match | null)[];
  vong16Slots: (Match | null)[];
  vong32Slots: (Match | null)[];
  showChungket: boolean;
  isLowerBranch?: boolean;
}

function SemifinalBranch({
  match,
  predictionMap,
  onPredictClick,
  isLoggedIn,
  isAdmin,
  selectedBracketStage,
  showBanket,
  showTuket,
  showVong16,
  showVong32,
  tuKetSlots,
  vong16Slots,
  vong32Slots,
  showChungket,
  isLowerBranch = false
}: SemifinalBranchProps) {
  return (
    <div className="flex items-center">
      {(showBanket || showTuket || showVong16 || showVong32) && (
        <div className="flex items-center">
          <div
            className={`flex flex-col relative pr-8 flex-shrink-0 transition-all duration-500 ${selectedBracketStage === 'all' ? 'gap-12' : 'gap-2'
              }`}
            id={isLowerBranch ? undefined : "col-tuket"}
          >
            <QuarterfinalBranch
              match={tuKetSlots[0]}
              predictionMap={predictionMap}
              onPredictClick={onPredictClick}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              selectedBracketStage={selectedBracketStage}
              showBanket={showBanket}
              showTuket={showTuket}
              showVong16={showVong16}
              showVong32={showVong32}
              vong16Slots={[vong16Slots[0], vong16Slots[1]]}
              vong32Slots={[vong32Slots[0], vong32Slots[1], vong32Slots[2], vong32Slots[3]]}
              branchIndex={isLowerBranch ? 3 : 1}
            />
            <QuarterfinalBranch
              match={tuKetSlots[1]}
              predictionMap={predictionMap}
              onPredictClick={onPredictClick}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              selectedBracketStage={selectedBracketStage}
              showBanket={showBanket}
              showTuket={showTuket}
              showVong16={showVong16}
              showVong32={showVong32}
              vong16Slots={[vong16Slots[2], vong16Slots[3]]}
              vong32Slots={[vong32Slots[4], vong32Slots[5], vong32Slots[6], vong32Slots[7]]}
              branchIndex={isLowerBranch ? 4 : 2}
            />
            {showTuket && showBanket && (
              <div className={`absolute right-0 w-8 border-r border-y border-white/10 rounded-r ${selectedBracketStage === 'all'
                ? 'connector-qf-sf-all'
                : 'connector-qf-sf-tuket'
                }`} />
            )}
          </div>
          <div className="w-8 h-px bg-white/10 flex-shrink-0" />
        </div>
      )}

      {showBanket && (
        <div className="flex items-center">
          <BracketCard
            match={match}
            userPrediction={match ? predictionMap.get(match.id) : undefined}
            onPredictClick={onPredictClick}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            placeholderHome={isLowerBranch ? "Thắng Tứ kết 3" : "Thắng Tứ kết 1"}
            placeholderAway={isLowerBranch ? "Thắng Tứ kết 4" : "Thắng Tứ kết 2"}
            matchIndexInfo={isLowerBranch ? "Bán kết 2" : "Bán kết 1"}
          />
          {showChungket && <div className="w-8 h-px bg-white/10 flex-shrink-0" />}
        </div>
      )}
    </div>
  );
}

// 5. Component con hiển thị cột Finals (Chung kết & Tranh hạng ba)
interface FinalsColumnProps {
  chungKetSlots: (Match | null)[];
  predictionMap: Map<number, Prediction>;
  onPredictClick: (match: Match) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

function FinalsColumn({
  chungKetSlots,
  predictionMap,
  onPredictClick,
  isLoggedIn,
  isAdmin
}: FinalsColumnProps) {
  return (
    <div className="flex flex-col relative ml-4 flex-shrink-0" id="col-chungket">
      {/* Trận Chung kết nằm trong luồng để căn giữa thẳng hàng với Bán kết */}
      <div className="space-y-2 relative">
        <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block text-center">🏆 Chung kết</span>
        <div className="flex items-center relative">
          {/* Line ngang nối từ Chung kết sang trái để chạm khít vào connector chữ U của Bán kết */}
          <div className="absolute -left-8 w-8 h-px bg-white/10" />
          <BracketCard
            match={chungKetSlots[0]}
            userPrediction={chungKetSlots[0] ? predictionMap.get(chungKetSlots[0].id) : undefined}
            onPredictClick={onPredictClick}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            placeholderHome="Thắng Bán kết 1"
            placeholderAway="Thắng Bán kết 2"
            matchIndexInfo="Chung kết"
          />
        </div>

        {/* Trận Tranh hạng ba được đặt absolute ở dưới để không kéo lệch tâm của trận Chung kết */}
        <div className="absolute top-[168px] left-0 right-0 space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block text-center">🥉 Tranh hạng ba</span>
          <BracketCard
            match={chungKetSlots[1]}
            userPrediction={chungKetSlots[1] ? predictionMap.get(chungKetSlots[1].id) : undefined}
            onPredictClick={onPredictClick}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            placeholderHome="Thua Bán kết 1"
            placeholderAway="Thua Bán kết 2"
            matchIndexInfo="Tranh hạng ba"
          />
        </div>
      </div>
    </div>
  );
}

// COMPONENT CHÍNH
export default function TournamentBracket({
  matches,
  predictions,
  isLoggedIn,
  isAdmin = false,
  onPredictClick
}: TournamentBracketProps) {
  const [selectedBracketStage, setSelectedBracketStage] = useState<'all' | 'vong32' | 'vong16' | 'tuket' | 'banket'>('all');

  const scrollToStage = (stageId: string) => {
    const el = document.getElementById(`col-${stageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const showVong32 = selectedBracketStage === 'all' || selectedBracketStage === 'vong32';
  const showVong16 = selectedBracketStage === 'all' || selectedBracketStage === 'vong32' || selectedBracketStage === 'vong16';
  const showTuket = selectedBracketStage === 'all' || selectedBracketStage === 'vong16' || selectedBracketStage === 'tuket';
  const showBanket = selectedBracketStage === 'all' || selectedBracketStage === 'tuket' || selectedBracketStage === 'banket';
  const showChungket = selectedBracketStage === 'all' || selectedBracketStage === 'banket';

  // Convert predictions array to a lookup map for faster rendering
  const predictionMap = new Map<number, Prediction>();
  predictions.forEach(p => predictionMap.set(p.match_id, p));

  const findMatch = (id: number) => matches.find(m => m.id === id) || null;

  // Vòng 1/32 (16 trận đấu)
  const vong32Slots = [
    findMatch(74), findMatch(77),
    findMatch(73), findMatch(75),
    findMatch(83), findMatch(84),
    findMatch(81), findMatch(82),
    findMatch(76), findMatch(78),
    findMatch(79), findMatch(80),
    findMatch(86), findMatch(88),
    findMatch(85), findMatch(87),
  ];

  // Vòng 1/16 (8 trận đấu)
  const vong16Slots = [
    findMatch(89), findMatch(90),
    findMatch(93), findMatch(94),
    findMatch(91), findMatch(92),
    findMatch(95), findMatch(96),
  ];

  // Tứ kết (4 trận đấu)
  const tuKetSlots = [
    findMatch(97), findMatch(98),
    findMatch(99), findMatch(100),
  ];

  // Bán kết (2 trận đấu)
  const banKetSlots = [
    findMatch(101),
    findMatch(102),
  ];

  // Chung kết & Tranh hạng ba
  const chungKetSlots = [
    findMatch(104),
    findMatch(103),
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span>Lọc cây thi đấu:</span>
        </div>
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'vong32', label: 'Vòng 1/32' },
            { id: 'vong16', label: 'Vòng 1/16' },
            { id: 'tuket', label: 'Tứ kết' },
            { id: 'banket', label: 'Bán kết' }
          ].map((stageOpt) => (
            <button
              key={stageOpt.id}
              onClick={() => {
                setSelectedBracketStage(stageOpt.id as any);
                if (stageOpt.id !== 'all') {
                  setTimeout(() => scrollToStage(stageOpt.id), 100);
                }
              }}
              className={`text-xs font-bold py-1.5 px-3.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${selectedBracketStage === stageOpt.id
                ? 'bg-primary/10 text-primary border-primary/20 shadow-sm shadow-primary/5'
                : 'bg-[#181b25]/60 text-muted-foreground border-white/5 hover:text-foreground hover:bg-white/10'
                }`}
            >
              {stageOpt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="glass-panel rounded-3xl border border-white/5 bg-white/[0.01] overflow-x-auto py-20 px-4 select-none">
        {/* Thanh filter cây thi đấu */}
        <div className={`mx-auto flex items-center relative p-8 ${selectedBracketStage === 'all'
          ? 'min-w-[1500px] h-[2336px] justify-start'
          : 'min-w-fit w-full max-w-4xl h-auto pt-12 pb-32 justify-center'
          }`}>
          <div className="flex items-center gap-8">
            {/* Left Side Semifinals & Quarterfinals Tree */}
            {(showBanket || showTuket || showVong16 || showVong32) && (
              <div className="flex items-center">
                <div className={`flex flex-col relative pr-8 flex-shrink-0 transition-all duration-500 ${selectedBracketStage === 'all' ? 'gap-[192px]' : 'gap-8'
                  }`} id="col-banket">

                  {/* Semifinal Branch 1 */}
                  <SemifinalBranch
                    match={banKetSlots[0]}
                    predictionMap={predictionMap}
                    onPredictClick={onPredictClick}
                    isLoggedIn={isLoggedIn}
                    isAdmin={isAdmin}
                    selectedBracketStage={selectedBracketStage}
                    showBanket={showBanket}
                    showTuket={showTuket}
                    showVong16={showVong16}
                    showVong32={showVong32}
                    tuKetSlots={[tuKetSlots[0], tuKetSlots[1]]}
                    vong16Slots={[vong16Slots[0], vong16Slots[1], vong16Slots[2], vong16Slots[3]]}
                    vong32Slots={[vong32Slots[0], vong32Slots[1], vong32Slots[2], vong32Slots[3], vong32Slots[4], vong32Slots[5], vong32Slots[6], vong32Slots[7]]}
                    showChungket={showChungket}
                    isLowerBranch={false}
                  />

                  {/* Semifinal Branch 2 */}
                  <SemifinalBranch
                    match={banKetSlots[1]}
                    predictionMap={predictionMap}
                    onPredictClick={onPredictClick}
                    isLoggedIn={isLoggedIn}
                    isAdmin={isAdmin}
                    selectedBracketStage={selectedBracketStage}
                    showBanket={showBanket}
                    showTuket={showTuket}
                    showVong16={showVong16}
                    showVong32={showVong32}
                    tuKetSlots={[tuKetSlots[2], tuKetSlots[3]]}
                    vong16Slots={[vong16Slots[4], vong16Slots[5], vong16Slots[6], vong16Slots[7]]}
                    vong32Slots={[vong32Slots[8], vong32Slots[9], vong32Slots[10], vong32Slots[11], vong32Slots[12], vong32Slots[13], vong32Slots[14], vong32Slots[15]]}
                    showChungket={showChungket}
                    isLowerBranch={true}
                  />

                  {/* Connector SF -> Final */}
                  {showBanket && showChungket && (
                    <div className={`absolute right-0 w-8 border-r border-y border-white/10 rounded-r ${selectedBracketStage === 'all'
                      ? 'connector-sf-final-all'
                      : 'connector-sf-final-banket'
                      }`} />
                  )}
                </div>
              </div>
            )}



            {/* Finals Column (Chung kết & Tranh hạng ba) */}
            {showChungket && (
              <FinalsColumn
                chungKetSlots={chungKetSlots}
                predictionMap={predictionMap}
                onPredictClick={onPredictClick}
                isLoggedIn={isLoggedIn}
                isAdmin={isAdmin}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
