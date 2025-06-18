const isCardinalDir = (dir) => {
  return Directions.outputCardinalDir.includes(dir);
};
const centerX = 100;
const centerY = 100;

const p3UROutputStrings = {
  yNorthStrat: {
    en: '${debuff} (${dir})',
    de: '${debuff} (${dir})',
    cn: '${debuff} (${dir})',
    ko: '${debuff} (${dir})',
  },
  dirCombo: {
    en: '${inOut} + ${dir}',
    de: '${inOut} + ${dir}',
    cn: '${inOut} + ${dir}',
    ko: '${inOut} + ${dir}',
  },
  fireSpread: {
    en: 'Fire - Spread',
    de: 'Feuer - verteilen',
    cn: '火分散',
    ko: '불 - 산개',
  },
  dropRewind: {
    en: 'Drop Rewind',
    de: 'Lege Rückführung ab',
    cn: '放置回返',
    ko: '리턴 설치',
  },
  baitStoplight: {
    en: 'Bait Stoplight',
    de: 'Köder Sanduhr',
    cn: '引导激光',
    ko: '모래시계 유도',
  },
  avoidStoplights: {
    en: 'Avoid stoplights',
    de: 'Vermeide Sanduhren',
    cn: '远离激光',
    ko: '모래시계 피하기',
  },
  stack: Outputs.stackMarker,
  middle: Outputs.middle,
  out: Outputs.out,
};


// Helper for Ultimate Relativity that finds relative North based on the yellow-tethered lights
// It takes an array of dir nums (e.g. 0-8), finds the two dir nums that have a single gap
// between them (e.g. 1 and 3) -- the apex of the "Y" -- and returns the dir num of the gap.
const findURNorthDirNum = (dirs) => {
  for (let i = 0; i < dirs.length; i++) {
    for (let j = i + 1; j < dirs.length; j++) {
      const [dir1, dir2] = [dirs[i], dirs[j]];
      if (dir1 === undefined || dir2 === undefined)
        return -1;
      const diff = Math.abs(dir1 - dir2);
      if (diff === 2)
        return Math.min(dir1, dir2) + 1;
      else if (diff === 6) // wrap around
        return (Math.max(dir1, dir2) + 1) % 8;
    }
  }
  return -1;
};

function faithPrio(data) {
    const config = data.triggerSetConfig.p1faith;
    const prio = {};
    let i = 0;
    for (let name of config.split(',')) {
        prio[name.trim()] = i++;
    }
    return prio;
}

function support(data) {
    return data.triggerSetConfig.support.split(',');
}

Options.Triggers.push({
  id: 'tinys-fru-triggers',
  zoneId: ZoneId.FuturesRewrittenUltimate,
  config: [
    {
      id: 'p1faith',
      name: {
        en: 'Fall of Faith Conga',
      },
      type: 'string',
      default: 'Andy,Tiny,Vaults,Shino,Scloral,Caspian,Karasu,Ruu',
    }, 
    {
      id: 'support',
      name: {
        en: 'Support',
      },
      type: 'string',
      default: 'Tiny,Scloral,Shino,Karasu',
    }, 
  ],

  triggers: [
    {
      id: 'FRU P1 Fall of Faith Collector',
      type: 'Tether',
      netRegex: {
        id: ['00F9', '011F'],
        source: ['Fatebreaker', 'Fatebreaker\'s Image'],
        capture: true,
      },
      // Only collect after Burnished Glory, since '00F9' tethers are used during TotH.
      condition: (data) => data.phase === 'p1' && data.p1SeenBurnishedGlory,
      durationSeconds: (data) => data.p1FallOfFaithTethers.length >= 3 ? 12.2 : 3,
      response: (data, matches, output) => {
        output.responseOutputStrings = {
        //   fire: { en: 'Fire', },
        //   lightning: { en: 'Lightning', },
          left: { en: 'LEFT', },
          right: { en: 'RIGHT', },
        //   one: { en: '1', },
        //   two: { en: '2', },
        //   three: { en: '3', },
        //   onYou: { en: 'On YOU', },
          side: { en: 'middle', },
          hitbox: { en: 'hitbox', },
          above: { en: 'top', },
          below: { en: 'bottom', },
          tetherYou: { en: '${dir} tether ${num}', },
          all: { en: '${side}: ${spot1} -> ${spot2}', },
        };
        const curTether = matches.id === '00F9' ? 'fire' : 'lightning';
        data.p1FallOfFaithTethers.push([curTether, matches.target]);
        if (data.p1FallOfFaithTethers.length < 4) {
          const num = data.p1FallOfFaithTethers.length;
          const dir = data.p1FallOfFaithTethers.length === 1
            ? output.left()
            : (data.p1FallOfFaithTethers.length === 2 ? output.right() : output.left());
          if (data.me === matches.target)
            return {
              alertText: output.tetherYou({ dir, num }),
            };
          return {};
        }
        const prio = faithPrio(data);
        const prioSort = (a, b) => prio[data.party.member(a).nick] - prio[data.party.member(b).nick];
        const myPrio = prio[data.party.member(data.me).nick];
        const [[e1, p1], [e2, p2], [e3, p3], [e4, p4]] = data.p1FallOfFaithTethers;
        if (e1 === undefined || e2 === undefined || e3 === undefined || e4 === undefined)
          return;
        if (p1 === undefined || p2 === undefined || p3 === undefined || p4 === undefined)
          return;
        let side; 
        let spot1;
        let spot2;
        let t1;
        let t2;
        if (data.me === p1) {
            side = output.left();
            spot1 = output.hitbox();
            spot2 = output.side();
        } else if (data.me === p2) {
            side = output.right();
            spot1 = output.hitbox();
            spot2 = output.side();
        } else if (data.me === p3) {
            side = output.left();
            spot1 = output.side();
            spot2 = output.hitbox();
        } else if (data.me === p4) {
            side = output.right();
            spot1 = output.side();
            spot2 = output.hitbox();
        } else {
            let fill = [];
            for (const name of data.party?.partyNames ?? []) {
                if (p1 != name && p2 != name && p3 != name && p4 != name)
                    fill.push(name);
            }
            fill.sort(prioSort);
            switch (fill.indexOf(data.me)) {
                case 0:
                    side = output.left();
                    spot1 = e1 == 'lightning' ? output.above() : output.side();
                    spot2 = e3 == 'lightning' ? output.above() : output.side();
                    break;
                case 1:
                    side = output.left();
                    spot1 = e1 == 'lightning' ? output.below() : output.side();
                    spot2 = e3 == 'lightning' ? output.below() : output.side();
                    break;
                case 2:
                    side = output.right();
                    spot1 = e2 == 'lightning' ? output.below() : output.side();
                    spot2 = e4 == 'lightning' ? output.below() : output.side();
                    break;
                case 3:
                    side = output.right();
                    spot1 = e2 == 'lightning' ? output.above() : output.side();
                    spot2 = e4 == 'lightning' ? output.above() : output.side();
                    break;
                default: 
                    return;
            }
        }
        if (side == output.left()) {
            t1 = e1;
            t2 = e3;
        } else {
            t1 = e2;
            t2 = e4;
        }
        const ret = {};
        const key = p4 == data.me ? 'alertText' : 'infoText';
        ret[key] = output.all({
            // e1: output[e1](),
            // e2: output[e2](),
            // e3: output[e3](),
            // e4: output[e4](),
            side,
            spot1,
            spot2,
            // t1: output[t1](),
            // t2: output[t2](),
        });
        return ret;
      },
    },
    {
      id: 'FRU P2 House of Light/Frigid Stone',
      type: 'HeadMarker',
      netRegex: { id: '0159' },
      alertText: (data, matches, output) => {
        data.p2FrigidStoneTargets.push(matches.target);
        if (data.p2FrigidStoneTargets.length !== 4)
          return;
        const inOut = data.p2AxeScytheSafe ? output[data.p2AxeScytheSafe]() : output.unknown();
        let mech = data.p2FrigidStoneTargets.includes(data.me) ? 'dropPuddle' : 'baitCleave';
        const firstIcicle = data.p2IcicleImpactStart[0] ?? 'unknown';
        if (firstIcicle === 'unknown')
          return 'god help you';
        // Assumes that if first Icicle Impacts spawn on cardinals, House of Light baits will also be
        // cardinals and Frigid Stone puddle drops will be intercards, and vice versa.
        const dir = mech === 'baitCleave'
          ? (isCardinalDir(firstIcicle) ? 'cardinals' : 'intercards')
          : (isCardinalDir(firstIcicle) ? 'intercards' : 'cardinals');
        const supports = support(data);
        let key;
        if (supports.indexOf(data.party.member(data.me).nick) !== -1) {
            if (dir == 'cardinals')
                key = 'comboNoSwap';
            else 
                key = 'comboSwap';
        } else {
            if (dir == 'cardinals')
                key = 'comboSwap';
            else 
                key = 'comboNoSwap';
        }
        // const where = data.p2AxeScytheSafe;
        // if (mech === 'baitCleave' && where == 'out') {
        //     mech = 'baitAndOut';
        // } else if (mech === 'baitCleave' && where == 'in') {
        //     mech = 'baitAndIn';
        // } else if (mech === 'dropPuddle' && where == 'out') {
        //     mech = 'dropAndOut';
        // } else if (mech === 'dropPuddle' && where == 'in') {
        //     mech = 'dropAndIn';
        // }
        return output[key]({ inOut });
      },
      outputStrings: {
        comboNoSwap: {
          en: 'STAY & ${inOut}',
        },
        comboSwap: {
          en: 'SWAP & ${inOut}',
        },
        in: Outputs.in,
        out: Outputs.out,
        unknown: Outputs.unknown,
      },
    },
    {
      id: 'FRU P2 Twin Silence/Stillness First',
      type: 'StartsUsing',
      // 9D01 - Twin Stillness (back safe -> front safe)
      // 9D02 - Twin Silence (front safe -> back safe)
      netRegex: { id: ['9D01', '9D02'] },
      durationSeconds: 2.8,
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          silence: Outputs.front,
          stillness: Outputs.back,
        };
        if (data.triggerSetConfig.sinboundRotate === 'aacc')
          return matches.id === '9D01'
            ? { alertText: output.stillness() }
            : {};
        return matches.id === '9D01'
          ? { alertText: output.stillness() }
          : { alertText: output.silence() };
      },
    },
    {
      id: 'FRU P3 Ultimate Relativity Y North Spot',
      type: 'Tether',
      // boss tethers to 5 stoplights - 0085 are purple tethers, 0086 are yellow
      netRegex: { id: '0086' },
      condition: (data) => data.phase === 'p3-ur',
      run: (data, matches, output) => {
        const id = matches.sourceId;
        const stoplight = data.p3RelativityStoplights[id];
        if (stoplight === undefined)
          return;
        const x = parseFloat(stoplight.x);
        const y = parseFloat(stoplight.y);
        data.p3RelativityYellowDirNums.push(Directions.xyTo8DirNum(x, y, centerX, centerY));
        if (data.p3RelativityYellowDirNums.length !== 3)
          return;
        const northDirNum = findURNorthDirNum(data.p3RelativityYellowDirNums);
        if (northDirNum === -1 || data.p3RelativityDebuff === undefined) {
          data.p3RelativityMyDirStr = output.unknown();
          return;
        }
        const role = data.role === 'dps' ? 'dps' : 'support';
        const debuff = data.p3RelativityDebuff;
        // const output8Dir = ['A', '2', 'B', '3', 'C', '4', 'D', '1'];
        const output8Dir = Directions.output8Dir;
        if (role === 'dps') {
          if (debuff === 'longFire' || debuff === 'ice') {
            const myDirNum = (northDirNum + 4) % 8; // relative South
            data.p3RelativityMyDirStr = output[output8Dir[myDirNum] ?? 'unknown']();
          } else if (debuff === 'mediumFire') {
            const myDirNum = (northDirNum + 2) % 8; // relative East
            data.p3RelativityMyDirStr = output[output8Dir[myDirNum] ?? 'unknown']();
          } else if (debuff === 'shortFire') {
            const dirs = [
              output8Dir[(northDirNum + 3) % 8] ?? 'unknown',
              output8Dir[(northDirNum + 5) % 8] ?? 'unknown',
            ];
            data.p3RelativityMyDirStr = dirs.map((dir) => output[dir]()).join(output.or());
          }
        } else { // supports
          if (debuff === 'shortFire' || debuff === 'ice') {
            const myDirNum = northDirNum; // relative North
            data.p3RelativityMyDirStr = output[output8Dir[myDirNum] ?? 'unknown']();
          } else if (debuff === 'mediumFire') {
            const myDirNum = (northDirNum + 6) % 8; // relative West
            data.p3RelativityMyDirStr = output[output8Dir[myDirNum] ?? 'unknown']();
          } else if (debuff === 'longFire') {
            const dirs = [
              output8Dir[(northDirNum + 1) % 8] ?? 'unknown',
              output8Dir[(northDirNum + 7) % 8] ?? 'unknown',
            ];
            data.p3RelativityMyDirStr = dirs.map((dir) => output[dir]()).join(output.or());
          }
        }
        //console.log(data.p3RelativityMyDirStr, data.me)
      },
      outputStrings: {
        dirN: 'A',
        dirNE: '2',
        dirE: 'B',
        dirSE: '3',
        dirW: 'C',
        dirSW: '4',
        dirS: 'S',
        dirNW: '1',
        //...Directions.outputStrings8Dir,
        or: Outputs.or,
        unknown: Outputs.unknown,
      },
    },
    {
      // Displays during Spirit Taker
      id: 'FRU P3 Apoc Safe',
      type: 'CombatantMemory',
      netRegex: { change: 'Add', pair: [{ key: 'BNpcID', value: '1EB0FF' }], capture: false },
      condition: (data) => data.phase === 'p3-apoc',
      delaySeconds: 9.2,
      durationSeconds: 11,
      suppressSeconds: 1,
      infoText: (data, _matches, output) => {
        const startNum = data.p3ApocFirstDirNum;
        const rotationDir = data.p3ApocRotationDir;
        if (startNum === undefined || rotationDir === undefined)
          return;
        // Safe spot(s) are 1 behind the starting dir and it's opposite (+4)
        // Melees lean one additional dir away from the rotation direction
        const safe = [
          (startNum - rotationDir + 8) % 8,
          (startNum + 4 - rotationDir + 8) % 8,
        ];
        const toward = [
          (safe[0] - rotationDir + 8) % 8,
          (safe[1] - rotationDir + 8) % 8,
        ];
        // We shouldn't just sort safe[], and toward[], since the elements are paired
        // and sorting might impact order of just one and not both.
        if (safe[0] > safe[1]) {
          safe.reverse();
          toward.reverse();
        }
        let safeStr = output['unknown']();
        let towardStr = output['unknown']();
        if (data.triggerSetConfig.apoc === 'dpsNE-CW') {
          const dpsDirs = [1, 2, 3, 4];
          const suppDirs = [5, 6, 7, 0];
          const myDirs = data.role === 'dps' ? dpsDirs : suppDirs;
          // use the index from safe, so we can make sure we're giving the correct 'toward'.
          const idx = safe.findIndex((idx) => myDirs.includes(idx));
          if (idx === -1)
            return output.safe({ dir1: safeStr, dir2: towardStr });
          const safeDir = safe[idx];
          const towardDir = toward[idx];
          if (safeDir === undefined || towardDir === undefined)
            return output.safe({ dir1: safeStr, dir2: towardStr });
          safeStr = output[Directions.output8Dir[safeDir] ?? 'unknown']();
          //console.log(player.me, jsafeDir, towardDir);
          let towardRel;
          if (safeDir == 0 && towardDir == 7) {
            towardRel = output.right();
          } else if (safeDir == 7 && towardDir == 0) {
            towardRel = output.left();
          } else if (safeDir < towardDir) {
            towardRel = output.left();
          } else {
            towardRel = output.right();
          }
          towardStr = `${towardRel} to ${output[Directions.output8Dir[towardDir] ?? 'unknown']()}`;
          return output.safe({ dir1: safeStr, dir2: towardStr });
        }
        safeStr = safe
          .map((dir) => output[Directions.output8Dir[dir] ?? 'unknown']())
          .join(output.or());
        towardStr = toward
          .map((dir) => output[Directions.output8Dir[dir] ?? 'unknown']())
          .join(output.or());
        return output.safe({ dir1: safeStr, dir2: towardStr });
      },
      outputStrings: {
        safe: {
          en: 'Safe: ${dir1} (lean ${dir2})',
          de: 'Sicher: ${dir1} (halte dich ${dir2})',
          cn: '${dir1} 偏 ${dir2} 安全',
          ko: '안전: ${dir1} (${dir2} 쪽으로 한칸)',
        },
        right: { en: 'RIGHT' },
        left: { en: 'LEFT' },
        ...Directions.outputStrings8Dir,
        or: Outputs.or,
      },
    },
  ],
});
