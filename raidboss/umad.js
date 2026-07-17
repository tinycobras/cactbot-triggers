const headMarkerData = {
  // Phase 1 Boss
  'fakeFire': '02A1',
  'trueFire': '02A2',
  'fakeIce': '02A3',
  'trueIce': '02A4',
  'fakeThunder': '02A5',
  'trueThunder': '02A6',
  // Phase 1 Players
  'tankbuster': '00DA',
  'dorito': '007F',
  'stack': '0080',
  // Phase 1 Tethers
  'imageTether': '002D',
  // Phase 2
  'sharedBuster': '0103',
  'stackPath': '02CB',
  'conePath': '02CD',
  'spreadPath': '02CC', // When standing in Path of Light tower, causes BAC1 Spellscatter (small aoe on the player)
};
const forsakenHeadmarkerIdToName = {
  '02CB': 'stack',
  '02CD': 'cone',
  '02CC': 'spread',
};

function isForsakenMelee(data) {
    const me = data.party.member(data.me).nick;
    return data.triggerSetConfig.forsaken_melees.split(',').indexOf(me) !== -1;
}

function forsakenPartner(data, memberFullName) {
    const nickToFullName = {};
    for (const fullName of data.party?.partyNames ?? [])
        nickToFullName[data.party.member(fullName).nick] = fullName;
    const groups = [
        data.triggerSetConfig.forsaken_p1,
        data.triggerSetConfig.forsaken_p2,
        data.triggerSetConfig.forsaken_p3,
        data.triggerSetConfig.forsaken_p4,
    ];
    const thisPlayerNick = data.party.member(memberFullName).nick;
    for (const group of groups) {
        const members = group.split(',');
        // This player isn't in this group, skip it.
        if (members.indexOf(thisPlayerNick) === -1) {
            continue;
        }

        // Find the other player in this group that's part of this party.
        for (const member of members) {
            if (!(member in nickToFullName)) {
                continue;
            }
            const fullName = nickToFullName[member];
            if (fullName == memberFullName) {
                continue;
            }
            return fullName;
        }
    }
}

function isInTower(data) {
    if (data.isTinysForsakenGroupA)
        return data.pathOfLightCounter == 1 || data.pathOfLightCounter == 2 || data.pathOfLightCounter == 3 || data.pathOfLightCounter == 8;
    return data.pathOfLightCounter == 4 || data.pathOfLightCounter == 5 || data.pathOfLightCounter == 6 || data.pathOfLightCounter == 7;
}

function forsakenOdd(data, _matches, output) {
    const isMelee = isForsakenMelee(data);
    // const marker = forsakenHeadmarkerIdToName[matches.id];
    const marker = data.forsakenPlayerHeadmarkers[data.me];
    const myRoleIsDPS = data.party.isDPS(data.me);
    const num = data.pathOfLightCounter;

    // if (data.pathOfLightCounter === 7 && !data.isTinysForsakenGroupA)
    //     console.log(data.me, marker)

    const inTower = isInTower(data);
    if (!inTower) {
        const tower = myRoleIsDPS ? output.rightTower() : output.leftTower();
        return output.oddOut({ num, tower })
    }
    if (marker === 'cone') 
        return output.oddTowerCone({ num, tower: output.leftTower() })
    if (marker === 'spread') 
        return output.oddTowerSpread({ num, tower: output.rightTower() })

    const stack1 = data.pathOfLightStackPlayers[0] ?? 'unknown';
    const stack2 = data.pathOfLightStackPlayers[1] ?? 'unknown';
    const stack1IsDPS = data.party.isDPS(stack1);
    const stack2IsDPS = data.party.isDPS(stack2);
    const defaultTower = myRoleIsDPS ? output.rightTower() : output.leftTower();
    const oppositeTower = myRoleIsDPS ? output.leftTower() : output.rightTower();

    let tower = defaultTower;
    if (isMelee && stack1IsDPS == stack2IsDPS)
        tower = oppositeTower;
    return output.oddTowerStack({ num, tower });
}

function forsakenEven(data, _matches, output) {
    const isMelee = isForsakenMelee(data);
    const marker = data.forsakenPlayerHeadmarkers[data.me];
    const myRoleIsDPS = data.party.isDPS(data.me);
    const inTower = isInTower(data);
    const num = data.pathOfLightCounter;
    if (!inTower) {
        const side = myRoleIsDPS ? output.evenDpsSide() : output.evenSupportSide();
        if (isMelee)
            return output.evenMeleeOut({ num, side });
        return output.evenRangedOut({ num, side });
    }
    const partner = forsakenPartner(data, data.me);
    const partnerMarker = data.forsakenPlayerHeadmarkers[partner];
    const defaultTower = myRoleIsDPS ? output.rightTower() : output.leftTower();
    const oppositeTower = myRoleIsDPS ? output.leftTower() : output.rightTower();

    let tower = defaultTower;
    if (isMelee && marker == partnerMarker)
        tower = oppositeTower;

    if (marker == 'cone') 
        return output.evenTowerCone({ num, tower });
    return output.evenTowerSpread({ num, tower });
}

const forsakenOutputStrings = {
  leftTower: { en: 'Left Tower' },
  rightTower: { en: 'Right Tower' },
  oddOut: { en: 'Odd/${num} out ${tower}' },
  oddTowerCone: { en: 'Odd/${num} Cone ${tower}' },
  oddTowerSpread: { en: 'Odd/${num} Spread ${tower}' },
  oddTowerStack: { en: 'Odd/${num} Stack ${tower}' },

  evenDpsSide: { en: 'Right' },
  evenSupportSide: { en: 'Left' },
  evenMeleeOut: { en: 'Even/${num} Out ${side}' },
  evenRangedOut: { en: 'Even/${num} Out ${side}' },
  evenTowerCone: { en: 'Even/${num} Tower Cone ${tower}' },
  evenTowerSpread: { en: 'Even/${num} Tower Spread ${tower}' },
};


Options.Triggers.push({
  id: 'tinys-umad-triggers',
  zoneId: ZoneId.DancingMadUltimate,
  config: [
    {
      id: 'forsaken_melees',
      name: { en: 'Forsaken melees' },
      type: 'string',
      default: 'Scloral,Karasu,Shino,Caspian,Vaults',
    },
    {
      id: 'forsaken_p1',
      name: { en: 'Forsaken pair 1' },
      type: 'string',
      default: 'Scloral,Aristia',
    },
    {
      id: 'forsaken_p2',
      name: { en: 'Forsaken pair 2' },
      type: 'string',
      default: 'Karasu,Tiny',
    },
    {
      id: 'forsaken_p3',
      name: { en: 'Forsaken pair 3' },
      type: 'string',
      default: 'Shino,Caspian,Ruu',
    },
    {
      id: 'forsaken_p4',
      name: { en: 'Forsaken pair 4' },
      type: 'string',
      default: 'Vaults,Andy',
    },
  ],

  triggers: [
    {
      id: 'DMU P1 Tele-Portents',
      type: 'GainsEffect',
      netRegex: {
        effectId: [
          '130C',
          '130D',
          '130E',
          '130F',
          '13D7',
          '13D8',
          '13D9',
          '13DA', // Left
        ],
        capture: true,
      },
      condition: Conditions.targetIsYou(),
      durationSeconds: 7,
      infoText: (data, _matches, output) => {
        const tp1 = data.myTelePortent1;
        const tp2 = data.myTelePortent2;
        if (tp1 === undefined || tp2 === undefined)
          return;
        const portents = tp1 + tp2;
        const dir1Map = {
          'upup': 'init_west',
          'downdown': 'init_east',
          'rightright': 'init_north',
          'leftleft': 'init_south',
          'downleft': 'init_dirESE',
          'downright': 'init_northeast',
          'rightup': 'init_northwest',
          'rightdown': 'init_dirNNE',
          'leftup': 'init_dirSSW',
          'leftdown': 'init_southeast',
          'upright': 'init_dirWNW',
          'upleft': 'init_southwest',
        };
        const dir2Map = {
          'upup': 'move_south',
          'downdown': 'move_north',
          'rightright': 'move_west',
          'leftleft': 'move_east',
          'downleft': 'move_south',
          'downright': 'move_west',
          'rightup': 'move_south',
          'rightdown': 'move_east',
          'leftup': 'move_west',
          'leftdown': 'move_north',
          'upright': 'move_north',
          'upleft': 'move_east',
        };
        const dir1 = dir1Map[portents];
        const dir2 = dir2Map[portents];
        return output.clockwise({
          dir1: output[dir1 ?? 'unknown'](),
          dir2: output[dir2 ?? 'unknown'](),
        });
      },
      outputStrings: {
        init_north: { en: 'North' },
        init_east: { en: 'East' },
        init_south: { en: 'South' },
        init_west: { en: 'West' },
        init_northwest: { en: 'Northwest' },
        init_northeast: { en: 'Northeast' },
        init_southeast: { en: 'Southeast' },
        init_southwest: { en: 'Southwest' },
        init_dirESE: { en: 'ESE' },
        init_dirNNE: { en: 'NNE' },
        init_dirSSW: { en: 'SSW' },
        init_dirWNW: { en: 'WNW' },
        move_south: { en: 'Move South' },
        move_north: { en: 'Move North' },
        move_east: { en: 'Move East' },
        move_west: { en: 'Move West' },
        clockwise: { en: '${dir1} => ${dir2}' },
      },
    },

    {
      id: 'DMU P2 Forsaken Group Tracker (Tiny)',
      type: 'HeadMarker',
      netRegex: {
        id: [
          headMarkerData['stackPath'],
          headMarkerData['conePath'],
          headMarkerData['spreadPath'],
        ],
        capture: true,
      },
      condition: (data, matches) => { return data.pathOfLightCounter === 1 },
      run: (data, matches) => {
        const thisMarker = data.forsakenPlayerHeadmarkers[matches.target];
        const partner = forsakenPartner(data, matches.target);
        if (partner === data.me || matches.target === data.me) {
            const partnerMarker = data.forsakenPlayerHeadmarkers[partner];
            if (partnerMarker) {
                data.isTinysForsakenGroupA = partnerMarker != thisMarker;
            }
        }
      },
    },


    {
      id: 'DMU P2 Path of Light Towers 1',
      type: 'HeadMarker',
      netRegex: {
        id: [
          headMarkerData['stackPath'],
          headMarkerData['conePath'],
          headMarkerData['spreadPath'],
        ],
        capture: true,
      },
      condition: (data, matches) => {
        return data.me === matches.target && data.pathOfLightCounter === 1;
      },
      delaySeconds: 0.1,
      durationSeconds: 9,
      infoText: forsakenOdd,
      outputStrings: forsakenOutputStrings,
    },
    {
      id: 'DMU P2 Path of Light Towers 2',
      type: 'HeadMarker',
      netRegex: {
        id: [
          headMarkerData['stackPath'],
          headMarkerData['conePath'],
          headMarkerData['spreadPath'],
        ],
        capture: false,
      },
      condition: (data) => data.pathOfLightCounter === 2,
      delaySeconds: 0.1,
      durationSeconds: 9,
      suppressSeconds: 1,
      infoText: forsakenEven,
      outputStrings: forsakenOutputStrings,
    },
    {
      id: 'DMU P2 All Things Ending Baits',
      type: 'Ability',
      netRegex: { id: ['BAD2', 'BAD3'], source: 'Kefka', capture: true },
      delaySeconds: 1.7,
      alertText: function(data, matches, output) {
        const isFuture = matches.id === 'BAD2';
        const bait = isFuture ? output.future() : output.past();
        const then = forsakenOdd(data, matches, output);
        return output.baitThen({ bait, then });
      },
      outputStrings: {
        future: { en: 'Bait opposite towers', },
        past: { en: 'Bait between towers', },
        baitThen: { en: '${bait} => ${then}' },
        ...forsakenOutputStrings
      },
    },
    {
      id: 'DMU P2 Path of Light Towers 3',
      type: 'StartsUsing',
      netRegex: { id: ['BADC', 'BADD'], source: 'Kefka', capture: false },
      condition: (data) => data.pathOfLightCounter === 3,
      suppressSeconds: 1,
      alertText: forsakenOdd,
      outputStrings: forsakenOutputStrings,
    },
    {
      id: 'DMU P2 Path of Light Towers 4',
      type: 'HeadMarker',
      netRegex: {
        id: [
          headMarkerData['stackPath'],
          headMarkerData['conePath'],
          headMarkerData['spreadPath'],
        ],
        capture: false,
      },
      condition: (data) => data.pathOfLightCounter === 4,
      delaySeconds: 0.1,
      durationSeconds: 9,
      suppressSeconds: 1,
      infoText: forsakenEven,
      outputStrings: forsakenOutputStrings,
    },
    {
      id: 'DMU P2 Path of Light Towers 5',
      type: 'StartsUsing',
      netRegex: { id: ['BADC', 'BADD'], source: 'Kefka', capture: false },
      condition: (data) => data.pathOfLightCounter === 5,
      suppressSeconds: 1,
      alertText: forsakenOdd,
      outputStrings: forsakenOutputStrings,
    },
    {
      id: 'DMU P2 Path of Light Towers 6',
      type: 'HeadMarker',
      netRegex: {
        id: [
          headMarkerData['stackPath'],
          headMarkerData['conePath'],
          headMarkerData['spreadPath'],
        ],
        capture: false,
      },
      condition: (data) => data.pathOfLightCounter === 6,
      delaySeconds: 0.1,
      durationSeconds: 9,
      suppressSeconds: 1,
      infoText: forsakenEven,
      outputStrings: forsakenOutputStrings,
    },
    {
      id: 'DMU P2 Path of Light Towers 7',
      type: 'StartsUsing',
      netRegex: { id: ['BADC', 'BADD'], source: 'Kefka', capture: false },
      condition: (data) => data.pathOfLightCounter === 7,
      suppressSeconds: 1,
      alertText: forsakenOdd,
      outputStrings: forsakenOutputStrings,
    },
    {
      id: 'DMU P2 Path of Light Towers 8',
      type: 'HeadMarker',
      netRegex: {
        id: [
          headMarkerData['stackPath'],
          headMarkerData['conePath'],
          headMarkerData['spreadPath'],
        ],
        capture: false,
      },
      condition: (data) => data.pathOfLightCounter === 8,
      delaySeconds: 0.1,
      durationSeconds: 9,
      suppressSeconds: 9999,
      infoText: forsakenEven,
      outputStrings: forsakenOutputStrings,
    },

  ],
});
