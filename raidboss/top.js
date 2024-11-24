const headmarkers = {
  // vfx/lockon/eff/lockon5_t0h.avfx
  spread: '0017',
  // vfx/lockon/eff/tank_lockonae_5m_5s_01k1.avfx
  buster: '0157',
  // vfx/lockon/eff/z3oz_firechain_01c.avfx through 04c
  firechainCircle: '01A0',
  firechainTriangle: '01A1',
  firechainSquare: '01A2',
  firechainX: '01A3',
  // vfx/lockon/eff/com_share2i.avfx
  stack: '0064',
  // vfx/lockon/eff/all_at8s_0v.avfx
  meteor: '015A',
};
function groupAndPrioMap(data) {
    let g1key = `g1${data.phase}`;
    let g2key = `g2${data.phase}`;
    const g1 = data.triggerSetConfig[g1key] || data.triggerSetConfig.g1p1;
    const g2 = data.triggerSetConfig[g2key] || data.triggerSetConfig.g2p1;
    const group = {};
    const prio = {};
    let i = 0;
    for (let name of g1.split(',')) {
        group[name.trim()] = 0;
        prio[name.trim()] = i++;
    }
    i = 0;
    for (let name of g2.split(',')) {
        group[name.trim()] = 1;
        prio[name.trim()] = i++;
    }
    return [group, prio];
}

function p3TransitionPrioMap(data) {
    const g1 = data.triggerSetConfig.g1p1;
    const g2 = data.triggerSetConfig.g2p1;
    const prio = {};
    let i = 0;
    for (let name of g1.split(',')) {
        prio[name.trim()] = i++;
    }
    for (let name of g2.split(',').reverse()) {
        prio[name.trim()] = i++;
    }
    return prio;
}

function p2SynergyPartner(data, player) {
  const myMarker = data.synergyMarker[player];
  for (const [name, marker] of Object.entries(data.synergyMarker)) {
    if (marker === myMarker && name !== player) {
      return name;
    }
  }
  return null;
}
const firstMarker = parseInt('0017', 16);


const getHeadmarkerId = (data, matches) => {
  if (data.decOffset === undefined)
    data.decOffset = parseInt(matches.id, 16) - firstMarker;
  // The leading zeroes are stripped when converting back to string, so we re-add them here.
  // Fortunately, we don't have to worry about whether or not this is robust,
  // since we know all the IDs that will be present in the encounter.
  return (parseInt(matches.id, 16) - data.decOffset).toString(16).toUpperCase().padStart(4, '0');
};

function p2PlaystationMap(data, player) {
  const isFar = data.glitch === 'remote';
  const myMarker = data.synergyMarker[player];
  let myPos = {
    circle: 2,
    triangle: 3,
    square: 1,
    cross: 0,
  }[myMarker];
  let partner = p2SynergyPartner(data, player);
  const meNick = data.party.member(player).nick;
  const partnerNick = data.party.member(partner).nick;
  const [groups, prio] = groupAndPrioMap(data);
  let myGroup = groups[meNick];
  let partnerGroup = groups[partnerNick];
  if (myGroup == partnerGroup && prio[meNick] > prio[partnerNick]) {
    myGroup = 1 - myGroup;
  }

  if (isFar && myGroup == 1) {
    if (myPos === 0) {
      myPos = 3;
    } else if (myPos === 3) {
      myPos = 0;
    }
  }
  return {
    marker: myMarker,
    side: myGroup,
    pos: myPos,
    partner,
  };
}

function p1InLinePartner(data) {
  const myNum = data.inLine[data.me];
  if (myNum === undefined)
    return;
  let partner = null;
  for (const [name, num] of Object.entries(data.inLine)) {
    if (num === myNum && name !== data.me) {
      partner = name;
      break;
    }
  }
  const meNick = data.party.member(data.me).nick;
  const partnerNick = data.party.member(partner).nick;
  const [groups, prio] = groupAndPrioMap(data);
  let swapping = groups[meNick] == groups[partnerNick] && prio[meNick] > prio[partnerNick];

  return {
    myNum,
    swapping,
    partner,
  };
}

const looper = {
  durationSeconds: 8,
  response: (data, _matches, output) => {
    const mechanicNum = data.loopBlasterCount + 1;
    if (mechanicNum >= 5)
      return;
    const partnerData = p1InLinePartner(data);
    if (partnerData === undefined)
      return;
    const { myNum, swapping, partner } = partnerData;
    const swapstr = swapping ? output.swap() : output.noswap();
    if (myNum === undefined)
      return { infoText: output.unknown() };
    if (myNum === mechanicNum)
      return { alertText: output.tower({ num: mechanicNum, swapstr }) };
    if (mechanicNum === myNum + 2 || mechanicNum === myNum - 2)
      return { alertText: output.tether({ num: mechanicNum, swapstr }) };

    let next = null;
    switch (myNum) {
      case 1:
        if (mechanicNum == 2) {
          next = output.nextTether();
        } else {
          return { infoText: output.doneWithMechanic() };
        }
        break;
      case 2:
        next = mechanicNum == 1 ? output.nextTower() : output.nextTether();
        break;
      case 3:
        if (mechanicNum == 2) {
          next = output.nextTower();
        } else {
          return { infoText: output.doneWithMechanic() };
        }
        break;
      case 4:
        next = mechanicNum == 1 ? output.nextTether() : output.nextTower();
        break;
    }
    return { infoText: output.numWithNext({ num: mechanicNum, next, swapstr }) };
  },
  outputStrings: {
    tower: {
      en: 'Tower ${num} ${swapstr}',
    },
    tether: {
      en: 'Tether ${num} ${swapstr}',
    },
    numWithNext: {
      en: 'chill for now (next: ${next} ${swapstr})',
    },
    doneWithMechanic: {
      en: 'chill: dont get hit by anything',
    },
    unknown: Outputs.unknown,
    swap: 'and YOU SWAP',
    noswap: 'noswap',
    nextTower: 'tower',
    nextTether: 'tether',
  },
};

Options.Triggers.push({
  id: 'tinys-top-triggers',
  zoneId: ZoneId.TheOmegaProtocolUltimate,
  config: [
    {
      id: 'g1p1',
      name: {
        en: 'Group 1 in Phase 1 (first never swaps)',
      },
      type: 'string',
      default: 'Tiny,Andy,Caspian,Scloral',
    },
    {
      id: 'g2p1',
      name: {
        en: 'Group 2 in Phase 1 (first never swaps)',
      },
      type: 'string',
      default: 'Karasu,Ruu,Shino,Vaults',
    },
  ],

  triggers: [
    // FINISHED
    {
      id: 'TOP In Line Debuff',
      type: 'GainsEffect',
      netRegex: { effectId: ['BBC', 'BBD', 'BBE', 'D7B'], capture: false },
      condition: (data) => data.phase === 'p1',
      delaySeconds: 0.5,
      durationSeconds: 5,
      suppressSeconds: 1,
      infoText: (data, _matches, output) => {
        const partnerData = p1InLinePartner(data);
        if (partnerData === undefined)
          return;
        const { myNum, swapping, partner } = partnerData;
        return output.text({
            num: myNum,
            player: data.party.member(partner),
            swapstr: swapping ? output.swap() : output.noswap(),
        });
      },
      outputStrings: {
        text: {
          en: '${num} (with ${player} ${swapstr})',
        },
        swap: 'and YOU SWAP',
        noswap: 'noswap',
        unknown: Outputs.unknown,
      },
    },

    // FINISHED
    {
      id: 'TOP Synergy Marker',
      type: 'GainsEffect',
      // In practice, glitch1 glitch2 marker1 marker2 glitch3 glitch4 etc ordering.
      netRegex: { effectId: ['D63', 'D64'], capture: false },
      delaySeconds: 0.5,
      durationSeconds: 14,
      suppressSeconds: 10,
      infoText: (data, _matches, output) => {
        const isFar = data.glitch === 'remote';
        const { side, pos, partner } = p2PlaystationMap(data, data.me);
        return output.text({
          side: side == 0 ? output.left() : output.right(),
          pos: pos + 1,
          glitch: isFar ? output.far() : output.near(),
          player: data.party.member(partner),
        });
      },
      outputStrings: {
        left: { en: 'LEFT' },
        right: { en: 'RIGHT' },
        near: { en: 'NEAR' },
        far: { en: 'FAR' },
        text: {
          en: '${side} #${pos} ${glitch} (paired with ${player})',
        },
        unknown: Outputs.unknown,
      },
    },

    // FINISHED 
    {
      id: 'TOP Spotlight',
      type: 'HeadMarker',
      netRegex: {},
      condition: (data, matches) => getHeadmarkerId(data, matches) === headmarkers.stack,
      durationSeconds: 14,
      infoText: (data, matches, output) => {
        // accumulate the stacks
        data.spotlightStacks.push(matches.target);
        let [p1, p2] = data.spotlightStacks.sort();
        if (data.spotlightStacks.length !== 2 || p1 === undefined || p2 === undefined)
          return;

        // console.log("RAW p1", p1);
        // console.log("RAW p2", p2);
        // console.log("RAW data.me", data.me);
        // console.log("RAW data.spotlightStacks", JSON.stringify(data.spotlightStacks));
        // console.log("RAW data.synergyMarker", JSON.stringify(data.synergyMarker));

        const isFar = data.glitch === 'remote';
        const [groups, prio] = groupAndPrioMap(data);
        p1 = data.party.member(p1);
        p2 = data.party.member(p2);
        const myData = p2PlaystationMap(data, data.me);
        let p1Data = p2PlaystationMap(data, p1.name);
        let p2Data = p2PlaystationMap(data, p2.name);

        // if a swap is happening, and p1 is further S, then swap p1/p2
        if (p1Data.side == p2Data.side && p1Data.pos > p2Data.pos) {
          // console.log('p1 is below p2, swapping internally');
          [p1Data, p2Data] = [p2Data, p1Data];
          [p1, p2] = [p2, p1];
        }

        // if a swap is happening p1 and their partner are swapping
        let swapstr = output.noswap();
        let swap1 = null;
        let swap2 = null;
        if (p1Data.side == p2Data.side) {
          // console.log('swap detected', p1.name, JSON.stringify(p1Data));
          // console.log('             ', p2.name, JSON.stringify(p2Data));
          swap1 = p1.name;
          swap2 = p2SynergyPartner(data, p1.name);
          let otherSwapper = data.party.member(swap2);
          swapstr = output.swap({ p1, p2: otherSwapper });
        } else {
          // console.log('noswap');
        }

        let group0Dir = output.left();
        let group1Dir = isFar ? output.right() : output.down();
        let dir;
        if (myData.side == 0) {
          if (data.me === swap1 || data.me === swap2) {
            // console.log('ima left side swapper');
            dir = group1Dir;
          } else {
            // console.log('ima left side');
            dir = group0Dir;
          }
        } else {
          if (data.me === swap1 || data.me === swap2) {
            // console.log('ima right side swapper');
            dir = group0Dir;
          } else {
            // console.log('ima right side');
            dir = group1Dir;
          }
        }

        let glitch = isFar ? output.far() : output.near();
        // console.log('FINAL MESSAGE', dir, swapstr, glitch);
        let ret = output.text({ dir, swapstr, glitch });
        // console.log(ret);
        return ret;
      },
      outputStrings: {
        text: {
          en: 'GO ${dir} & ${glitch} (${swapstr})',
        },
        near: 'NEAR',
        far: 'FAR',
        left: 'LEFT',
        down: 'DOWN',
        right: 'RIGHT',
        noswap: 'no swaps',
        swap: 'swap ${p1} / ${p2}',
        unknown: Outputs.unknown,
      },
    },
    {
      id: 'TOP Program Loop First Debuffs',
      type: 'StartsUsing',
      // 7B07 = Blaster cast (only one cast, but 4 abilities)
      netRegex: { id: '7B07', source: 'Omega', capture: false },
      ...looper,
    },
    {
      id: 'TOP Program Loop Other Debuffs',
      type: 'Ability',
      netRegex: { id: '7B08', source: 'Omega', capture: false },
      preRun: (data) => data.loopBlasterCount++,
      ...looper,
    },

    {
      id: 'TOP Sniper Cannon Fodder',
      type: 'GainsEffect',
      netRegex: { effectId: 'D61' },
      preRun: (data, matches) => data.cannonFodder[matches.target] = 'spread',
      response: () => {},
    },
    {
      id: 'TOP High-Powered Sniper Cannon Fodder',
      type: 'GainsEffect',
      netRegex: { effectId: 'D62', capture: false },
      delaySeconds: 0.5,
      durationSeconds: 15,
      suppressSeconds: 1,
      response: (data, _matches, output) => {
        const spreaders = [];
        const jumpers = [];
        const stackers = [];

        for (const name of data.party?.partyNames ?? []) {
          switch (data.cannonFodder[name]) {
            case 'spread':
              spreaders.push(name);
              break;
            case 'stack':
              stackers.push(name);
              break;
            default:
              jumpers.push(name);
              break;
          }
        }
        const prio = p3TransitionPrioMap(data);

        const prioSort = (a, b) => prio[data.party.member(a).nick] - prio[data.party.member(b).nick];
        spreaders.sort(prioSort);
        stackers.sort(prioSort);
        jumpers.sort(prioSort);

        let i = 0;
        for (const name of spreaders) {
          i++;
          if (name !== data.me)
            continue;

          let dir = output.unknown();
          switch (i) {
            case 1: dir = output.left(); break;
            case 2: dir = output.topLeft(); break;
            case 3: dir = output.topRight(); break;
            case 4: dir = output.right(); break;
          }
          return { alertText: output.spread({ dir }) };
        }

        i = 0;
        for (const name of stackers) {
          i++;
          if (name !== data.me)
            continue;

          let dir = output.unknown();
          switch (i) {
            case 1: dir = output.backLeft(); break;
            case 2: dir = output.backRight(); break;
          }
          return { alertText: output.stacker({ dir }) };
        }

        i = 0;
        for (const name of jumpers) {
          i++;
          if (name !== data.me)
            continue;

          let dir = output.unknown();
          switch (i) {
            case 1: dir = output.backLeft(); break;
            case 2: dir = output.backRight(); break;
          }
          return { alertText: output.jump({ dir }) };
        }

        return { alertText: output.unknown() };
      },
      outputStrings: {
        spread: 'FORWARD then ${dir}',
        stacker: 'BACKWARD then ${dir}',
        jump: 'JUMP then go ${dir}',
        left: 'LEFT',
        right: 'RIGHT',
        topLeft: 'TOP LEFT',
        topRight: 'TOP RIGHT',
        backLeft: 'BACK LEFT',
        backRight: 'BACK RIGHT',
        unknown: Outputs.unknown,
      },
    },
  ],
});
