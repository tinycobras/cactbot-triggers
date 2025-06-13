const isCardinalDir = (dir) => {
  return Directions.outputCardinalDir.includes(dir);
};


// const headmarkers = {
//   // vfx/lockon/eff/lockon5_t0h.avfx
//   spread: '0017',
//   // vfx/lockon/eff/tank_lockonae_5m_5s_01k1.avfx
//   buster: '0157',
//   // vfx/lockon/eff/z3oz_firechain_01c.avfx through 04c
//   firechainCircle: '01A0',
//   firechainTriangle: '01A1',
//   firechainSquare: '01A2',
//   firechainX: '01A3',
//   // vfx/lockon/eff/com_share2i.avfx
//   stack: '0064',
//   // vfx/lockon/eff/all_at8s_0v.avfx
//   meteor: '015A',
// };

// function groupAndPrioMap(data) {
//     let g1key = `g1${data.phase}`;
//     let g2key = `g2${data.phase}`;
//     const g1 = data.triggerSetConfig[g1key] || data.triggerSetConfig.g1p1;
//     const g2 = data.triggerSetConfig[g2key] || data.triggerSetConfig.g2p1;
//     const group = {};
//     const prio = {};
//     let i = 0;
//     for (let name of g1.split(',')) {
//         group[name.trim()] = 0;
//         prio[name.trim()] = i++;
//     }
//     i = 0;
//     for (let name of g2.split(',')) {
//         group[name.trim()] = 1;
//         prio[name.trim()] = i++;
//     }
//     return [group, prio];
// }

// function p3TransitionPrioMap(data) {
//     const g1 = data.triggerSetConfig.g1p1;
//     const g2 = data.triggerSetConfig.g2p1;
//     const prio = {};
//     let i = 0;
//     for (let name of g1.split(',')) {
//         prio[name.trim()] = i++;
//     }
//     for (let name of g2.split(',').reverse()) {
//         prio[name.trim()] = i++;
//     }
//     return prio;
// }

// function p2SynergyPartner(data, player) {
//   const myMarker = data.synergyMarker[player];
//   for (const [name, marker] of Object.entries(data.synergyMarker)) {
//     if (marker === myMarker && name !== player) {
//       return name;
//     }
//   }
//   return null;
// }
// const firstMarker = parseInt('0017', 16);


// const getHeadmarkerId = (data, matches) => {
//   if (data.decOffset === undefined)
//     data.decOffset = parseInt(matches.id, 16) - firstMarker;
//   // The leading zeroes are stripped when converting back to string, so we re-add them here.
//   // Fortunately, we don't have to worry about whether or not this is robust,
//   // since we know all the IDs that will be present in the encounter.
//   return (parseInt(matches.id, 16) - data.decOffset).toString(16).toUpperCase().padStart(4, '0');
// };

// function p2PlaystationMap(data, player) {
//   const isFar = data.glitch === 'remote';
//   const myMarker = data.synergyMarker[player];
//   let myPos = {
//     circle: 2,
//     triangle: 3,
//     square: 1,
//     cross: 0,
//   }[myMarker];
//   let partner = p2SynergyPartner(data, player);
//   const meNick = data.party.member(player).nick;
//   const partnerNick = data.party.member(partner).nick;
//   const [groups, prio] = groupAndPrioMap(data);
//   let myGroup = groups[meNick];
//   let partnerGroup = groups[partnerNick];
//   if (myGroup == partnerGroup && prio[meNick] > prio[partnerNick]) {
//     myGroup = 1 - myGroup;
//   }

//   if (isFar && myGroup == 1) {
//     if (myPos === 0) {
//       myPos = 3;
//     } else if (myPos === 3) {
//       myPos = 0;
//     }
//   }
//   return {
//     marker: myMarker,
//     side: myGroup,
//     pos: myPos,
//     partner,
//   };
// }

// function p1InLinePartner(data) {
//   const myNum = data.inLine[data.me];
//   if (myNum === undefined)
//     return;
//   let partner = null;
//   for (const [name, num] of Object.entries(data.inLine)) {
//     if (num === myNum && name !== data.me) {
//       partner = name;
//       break;
//     }
//   }
//   const meNick = data.party.member(data.me).nick;
//   const partnerNick = data.party.member(partner).nick;
//   const [groups, prio] = groupAndPrioMap(data);
//   let swapping = groups[meNick] == groups[partnerNick] && prio[meNick] > prio[partnerNick];

//   return {
//     myNum,
//     swapping,
//     partner,
//   };
// }

// const looper = {
//   durationSeconds: 8,
//   response: (data, _matches, output) => {
//     const mechanicNum = data.loopBlasterCount + 1;
//     if (mechanicNum >= 5)
//       return;
//     const partnerData = p1InLinePartner(data);
//     if (partnerData === undefined)
//       return;
//     const { myNum, swapping, partner } = partnerData;
//     const swapstr = swapping ? output.swap() : output.noswap();
//     if (myNum === undefined)
//       return { infoText: output.unknown() };
//     if (myNum === mechanicNum)
//       return { alertText: output.tower({ num: mechanicNum, swapstr }) };
//     if (mechanicNum === myNum + 2 || mechanicNum === myNum - 2)
//       return { alertText: output.tether({ num: mechanicNum, swapstr }) };

//     let next = null;
//     switch (myNum) {
//       case 1:
//         if (mechanicNum == 2) {
//           next = output.nextTether();
//         } else {
//           return { infoText: output.doneWithMechanic() };
//         }
//         break;
//       case 2:
//         next = mechanicNum == 1 ? output.nextTower() : output.nextTether();
//         break;
//       case 3:
//         if (mechanicNum == 2) {
//           next = output.nextTower();
//         } else {
//           return { infoText: output.doneWithMechanic() };
//         }
//         break;
//       case 4:
//         next = mechanicNum == 1 ? output.nextTether() : output.nextTower();
//         break;
//     }
//     return { infoText: output.numWithNext({ num: mechanicNum, next, swapstr }) };
//   },
//   outputStrings: {
//     tower: {
//       en: 'Tower ${num} ${swapstr}',
//     },
//     tether: {
//       en: 'Tether ${num} ${swapstr}',
//     },
//     numWithNext: {
//       en: 'chill for now (next: ${next} ${swapstr})',
//     },
//     doneWithMechanic: {
//       en: 'chill: dont get hit by anything',
//     },
//     unknown: Outputs.unknown,
//     swap: 'and YOU SWAP',
//     noswap: 'noswap',
//     nextTower: 'tower',
//     nextTether: 'tether',
//   },
// };

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
          fire: { en: 'Fire', },
          lightning: { en: 'Lightning', },
          left: { en: 'LEFT', },
          right: { en: 'RIGHT', },
          one: { en: '1', },
          two: { en: '2', },
          three: { en: '3', },
          onYou: { en: 'On YOU', },
          side: { en: 'side', },
          hitbox: { en: 'hitbox', },
          above: { en: 'above', },
          below: { en: 'below', },
          tetherYou: { en: '${dir} ${num}: ${elem} (${target})', },
          tetherOther: { en: '${num}: ${elem} (${target})', },
          all: {
            // en: '${e1} => ${e2} => ${e3} => ${e4}',
            en: '${side}: ${spot1} then ${spot2} (${t1} then ${t2})',
          },
        };
        const curTether = matches.id === '00F9' ? 'fire' : 'lightning';
        data.p1FallOfFaithTethers.push([curTether, matches.target]);
        if (data.p1FallOfFaithTethers.length < 4) {
          const num = data.p1FallOfFaithTethers.length === 1
            ? 'one'
            : (data.p1FallOfFaithTethers.length === 2 ? 'two' : 'three');
          const dir = data.p1FallOfFaithTethers.length === 1
            ? output.left()
            : (data.p1FallOfFaithTethers.length === 2 ? output.right() : output.left());
          if (data.me === matches.target)
            return {
              alertText: output.tetherYou({
                num: output[num](),
                elem: output[curTether](),
                target: output.onYou(),
                dir,
              }),
            };
          return {
            infoText: output.tetherOther({
              num: output[num](),
              elem: output[curTether](),
              target: data.party.member(matches.target),
              dir,
            }),
          };
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
                case 3:
                    side = output.right();
                    spot1 = e2 == 'lightning' ? output.above() : output.side();
                    spot2 = e4 == 'lightning' ? output.above() : output.side();
                    break;
                case 2:
                    side = output.right();
                    spot1 = e2 == 'lightning' ? output.below() : output.side();
                    spot2 = e4 == 'lightning' ? output.below() : output.side();
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
            e1: output[e1](),
            e2: output[e2](),
            e3: output[e3](),
            e4: output[e4](),
            side,
            spot1,
            spot2,
            t1: output[t1](),
            t2: output[t2](),
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
          return output.combo({ inOut: inOut, dir: output.unknown(), mech: output[mech]() });
        // Assumes that if first Icicle Impacts spawn on cardinals, House of Light baits will also be
        // cardinals and Frigid Stone puddle drops will be intercards, and vice versa.
        const dir = mech === 'baitCleave'
          ? (isCardinalDir(firstIcicle) ? output.cardinals() : output.intercards())
          : (isCardinalDir(firstIcicle) ? output.intercards() : output.cardinals());
        const supports = support(data);
        let key;
        if (supports.indexOf(data.party.member(data.me).nick) !== -1) {
            if (dir == output.cardinals())
                key = 'comboNoSwap';
            else 
                key = 'comboSwap';
        } else {
            if (dir == output.cardinals())
                key = 'comboSwap';
            else 
                key = 'comboNoSwap';
        }
        const where = data.p2AxeScytheSafe;
        if (mech === 'baitCleave' && where == 'out') {
            mech = 'baitAndOut';
        } else if (mech === 'baitCleave' && where == 'in') {
            mech = 'baitAndIn';
        } else if (mech === 'dropPuddle' && where == 'out') {
            mech = 'dropAndOut';
        } else if (mech === 'dropPuddle' && where == 'in') {
            mech = 'dropAndIn';
        }
        return output[key]({ inOut: inOut, dir: dir, mech: output[mech]() });
      },
      outputStrings: {
        combo: {
          en: '(??unknown swap??) ${inOut} + ${dir} => ${mech}',
        },
        comboNoSwap: {
          en: '${inOut} => ${mech}',
        },
        comboSwap: {
          en: 'SWAP & ${inOut} => ${mech}',
        },
        dropPuddle: {
          en: 'Drop Puddle',
        },
        baitCleave: {
          en: 'Bait',
        },
        baitAndOut: { en: 'on circle & sprint in' },
        baitAndIn: { en: 'very in and stay' },
        dropAndOut: { en: 'edge of arena, move on drop' },
        dropAndIn: { en: 'wait then sprint out to circle' },
        in: Outputs.in,
        out: Outputs.out,
        cardinals: Outputs.cardinals,
        intercards: Outputs.intercards,
        unknown: Outputs.unknown,
      },
    },
  ],
});
