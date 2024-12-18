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

function monitorPrio(data) {
    const config = data.triggerSetConfig.monitorPrio;
    const prio = {};
    let i = 0;
    for (let name of config.split(',')) {
        prio[name.trim()] = i++;
    }
    return prio;
}

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
    {
      id: 'monitorPrio',
      name: {
        en: 'Monitor Prio (top-to-bottom)',
      },
      type: 'string',
      default: 'Caspian,Andy,Tiny,Scloral,Vaults,Ruu,Karasu,Shino',
    },
    {
      id: 'g1p4',
      name: {
        en: 'Group 1 in p4 (first never swaps)',
      },
      type: 'string',
      default: 'Scloral,Andy,Tiny,Caspian',
    },
    {
      id: 'g2p4',
      name: {
        en: 'Group 2 in p4 (first never swaps)',
      },
      type: 'string',
      default: 'Vaults,Ruu,Karasu,Shino',
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

    {
      id: 'TOP Spotlight',
      type: 'HeadMarker',
      netRegex: {},
      condition: (data, matches) => getHeadmarkerId(data, matches) === headmarkers.stack,
      durationSeconds: 14,
      response: (data, matches, output) => {
        // accumulate the stacks
        data.spotlightStacks.push(matches.target);
        let [p1, p2] = data.spotlightStacks.sort();
        if (data.spotlightStacks.length !== 2 || p1 === undefined || p2 === undefined)
          return;

        const isFar = data.glitch === 'remote';
        const [groups, prio] = groupAndPrioMap(data);
        p1 = data.party.member(p1);
        p2 = data.party.member(p2);
        const myData = p2PlaystationMap(data, data.me);
        let p1Data = p2PlaystationMap(data, p1.name);
        let p2Data = p2PlaystationMap(data, p2.name);

        // if a swap is happening, and p1 is further S, then swap p1/p2
        if (p1Data.side == p2Data.side && p1Data.pos > p2Data.pos) {
          [p1Data, p2Data] = [p2Data, p1Data];
          [p1, p2] = [p2, p1];
        }

        // if a swap is happening p1 and their partner are swapping
        let swapstr = output.noswap();
        let swap1 = null;
        let swap2 = null;
        if (p1Data.side == p2Data.side) {
          swap1 = p1.name;
          swap2 = p2SynergyPartner(data, p1.name);
          let otherSwapper = data.party.member(swap2);
          swapstr = output.swap({ p1, p2: otherSwapper });
        }

        let group0Dir = output.left();
        let group1Dir = isFar ? output.right() : output.down();
        let dir;
        if (myData.side == 0) {
          if (data.me === swap1 || data.me === swap2) {
            dir = group1Dir;
          } else {
            dir = group0Dir;
          }
        } else {
          if (data.me === swap1 || data.me === swap2) {
            dir = group0Dir;
          } else {
            dir = group1Dir;
          }
        }

        let glitch = isFar ? output.far() : output.near();
        if ((swap1 && swap1 == data.me) || (swap2 && swap2 == data.me)) {
          return { 
            alertText: output.swapText({ dir, swapstr, glitch }),
          };
        }
        return { 
          infoText: output.text({ dir, swapstr, glitch }),
        };
      },
      outputStrings: {
        text: {
          en: 'GO ${dir} & ${glitch} (${swapstr})',
        },
        swapText: {
          en: 'SWAP & ${dir} & ${glitch} (${swapstr})',
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

    // override this one to do nothing
    {
      id: 'TOP Sniper Cannon Fodder',
      type: 'GainsEffect',
      netRegex: { effectId: 'D61' },
      preRun: (data, matches) => data.cannonFodder[matches.target] = 'spread',
      response: () => {},
    },

    // override this one to do all the callouts for this mechanic
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
    {
      id: 'TOP Oversampled Wave Cannon Loading',
      type: 'GainsEffect',
      // D7C = Oversampled Wave Cannon Loading (facing right)
      // D7D = Oversampled Wave Cannon Loading (facing left)
      netRegex: { effectId: ['D7C', 'D7D'] },
      preRun: (data, matches) => data.monitorPlayers.push(matches),
      response: (data, _matches, output) => {
        if (data.monitorPlayers.length !== 3)
          return;
        const monitors = data.monitorPlayers.map((x) => x.target);
        const notMonitors = [];
        for (const name of data.party?.partyNames ?? []) {
          if (!monitors.includes(name))
            notMonitors.push(name);
        }

        const prio = monitorPrio(data);
        const prioSort = (a, b) => prio[data.party.member(a).nick] - prio[data.party.member(b).nick];
        monitors.sort(prioSort);
        notMonitors.sort(prioSort);

        const monitorIndex = monitors.indexOf(data.me);
        const notMonitorIndex = notMonitors.indexOf(data.me);
        data.monitorPlayers = [];
        if (monitorIndex !== -1) {
          return { alertText: output.monitorNumber({ n: monitorIndex + 1 }) }
        }
        return { infoText: output.unmarkedNumber({ n: notMonitorIndex + 1 }) }
      },
      outputStrings: {
        monitorNumber: {
          en: 'Monitor #${n}',
        },
        unmarkedNumber: {
          en: 'Unmarked #${n}',
        },
      },
    },
    {
      id: 'TOP Wave Cannon Stack',
      type: 'Ability',
      netRegex: { id: '5779', source: 'Omega', capture: false },
      delaySeconds: 0.3,
      suppressSeconds: 1,
      response: (data, _matches, output) => {
        const [m1, m2] = data.waveCannonStacks;
        if (data.waveCannonStacks.length !== 2 || m1 === undefined || m2 === undefined)
          return;
        const [groups, prio] = groupAndPrioMap(data);
        let p1 = data.party.member(m1.target);
        let p2 = data.party.member(m2.target);
        const me = data.party.member(data.me);

        // make it so `p2` is the swapper
        if (prio[p1.nick] > prio[p2.nick]) {
          [p1, p2] = [p2, p1];
        }

        // If there is no swap, say so, and if I'm not the one swapping,
        // also say so.
        if (groups[p1.nick] !== groups[p2.nick] || p1.nick == me.nick) {
          return {
            infoText: output.noSwap({
              player1: p1,
              player2: p2,
            }),
          };
        }

        // If I'm the swapper (p2 == m2) or if I'm the melee on the side of 
        // the other side from the marked players then I'm swapping.
        const markedToSwap = me.nick === p2.nick;
        const meleeSwapper = prio[me.nick] == 3 && groups[me.nick] !== groups[p2.nick];
        if (markedToSwap || meleeSwapper) {
          return {
            alarmText: output.youSwap({
              player1: p1,
              player2: p2,
            }),
          };
        }

        // And finally indicate that someone's swapping but it's not us.
        return {
          infoText: output.othersSwap({
            player1: p1,
            player2: p2,
          }),
        };
      },
      run: (data, _matches) => data.waveCannonStacks = [],
      outputStrings: {
        noSwap: {
          en: 'No swap (stacks on ${player1}, ${player2})',
        },
        othersSwap: {
          en: 'stacks on ${player1}, ${player2} (you noswap)',
        },
        youSwap: {
          en: 'SWAP SIDES (stacks on ${player1}, ${player2})',
        },
      },
    },
  ],
});
