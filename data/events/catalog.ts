import type { EventDefinition } from "@/types/events";

export const EVENT_DEFINITIONS: EventDefinition[] = [
  {
    "id": "travel_damaged_bridge",
    "name": "Damaged Bridge",
    "category": "TRAVEL",
    "tone": "BAD",
    "baseChance": 0.32,
    "weight": 1.0,
    "cooldownHours": 36,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "crossing_cost",
        "label": "The column crosses carefully",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_SUPPLY_DELTA",
            "targetBinding": "armyId",
            "amount": -45
          }
        ]
      }
    ],
    "requirements": [
      "army_traveling"
    ],
    "exclusions": []
  },
  {
    "id": "travel_merchant_caravan",
    "name": "Merchant Caravan Encounter",
    "category": "TRAVEL",
    "tone": "GOOD",
    "baseChance": 0.28,
    "weight": 1.0,
    "cooldownHours": 30,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "purchase_supplies",
        "label": "Supplies are purchased locally",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_SUPPLY_DELTA",
            "targetBinding": "armyId",
            "amount": 70
          }
        ]
      }
    ],
    "requirements": [
      "army_traveling"
    ],
    "exclusions": []
  },
  {
    "id": "travel_road_blockage",
    "name": "Road Blockage",
    "category": "TRAVEL",
    "tone": "BAD",
    "baseChance": 0.25,
    "weight": 0.9,
    "cooldownHours": 30,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "detour_cost",
        "label": "The detour consumes supplies",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_SUPPLY_DELTA",
            "targetBinding": "armyId",
            "amount": -30
          }
        ]
      }
    ],
    "requirements": [
      "army_traveling"
    ],
    "exclusions": []
  },
  {
    "id": "travel_deserter_sighting",
    "name": "Deserter Sighting",
    "category": "TRAVEL",
    "tone": "CONTEXTUAL",
    "baseChance": 0.22,
    "weight": 0.8,
    "cooldownHours": 48,
    "severity": "minor",
    "resolutionMode": "RNG",
    "outcomes": [
      {
        "id": "discipline_holds",
        "label": "Officers restore discipline",
        "weight": 2,
        "effects": [
          {
            "type": "ARMY_MORALE_SET",
            "targetBinding": "armyId",
            "value": "normal"
          }
        ]
      },
      {
        "id": "unease_spreads",
        "label": "Unease spreads through the column",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_MORALE_SET",
            "targetBinding": "armyId",
            "value": "low"
          }
        ]
      }
    ],
    "requirements": [
      "army_traveling"
    ],
    "exclusions": []
  },
  {
    "id": "travel_severe_rain",
    "name": "Severe Rain",
    "category": "TRAVEL",
    "tone": "BAD",
    "baseChance": 0.3,
    "weight": 1.1,
    "cooldownHours": 24,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "weather_losses",
        "label": "Rain ruins part of the marching stores",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_SUPPLY_DELTA",
            "targetBinding": "armyId",
            "amount": -55
          }
        ]
      }
    ],
    "requirements": [
      "army_traveling"
    ],
    "exclusions": []
  },
  {
    "id": "travel_local_guide",
    "name": "Local Guide Offers Help",
    "category": "TRAVEL",
    "tone": "GOOD",
    "baseChance": 0.2,
    "weight": 0.8,
    "cooldownHours": 48,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "guide_report",
        "label": "The guide provides useful local information",
        "weight": 1,
        "effects": [
          {
            "type": "PLAYER_KNOWLEDGE",
            "playerBinding": "playerId",
            "subjectBinding": "armyId",
            "summary": "Local guides provided fresh route and terrain information to this army.",
            "kind": "event",
            "confidence": "medium"
          }
        ]
      }
    ],
    "requirements": [
      "army_traveling",
      "player_owned_army"
    ],
    "exclusions": []
  },
  {
    "id": "campaign_local_supplies",
    "name": "Local Supplies Discovered",
    "category": "CAMPAIGN",
    "tone": "GOOD",
    "baseChance": 0.24,
    "weight": 1.0,
    "cooldownHours": 48,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "stores_recovered",
        "label": "Useful stores are recovered",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_SUPPLY_DELTA",
            "targetBinding": "armyId",
            "amount": 120
          }
        ]
      }
    ],
    "requirements": [
      "army_in_active_war"
    ],
    "exclusions": []
  },
  {
    "id": "campaign_supply_spoilage",
    "name": "Supply Stores Spoiled",
    "category": "CAMPAIGN",
    "tone": "BAD",
    "baseChance": 0.26,
    "weight": 1.0,
    "cooldownHours": 48,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "spoiled_stores",
        "label": "Spoiled stores are discarded",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_SUPPLY_DELTA",
            "targetBinding": "armyId",
            "amount": -120
          }
        ]
      }
    ],
    "requirements": [
      "army_in_active_war"
    ],
    "exclusions": []
  },
  {
    "id": "campaign_soldiers_desert",
    "name": "Soldiers Desert",
    "category": "CAMPAIGN",
    "tone": "BAD",
    "baseChance": 0.18,
    "weight": 0.8,
    "cooldownHours": 72,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "desertion_shock",
        "label": "Desertion harms morale",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_MORALE_SET",
            "targetBinding": "armyId",
            "value": "low"
          }
        ]
      }
    ],
    "requirements": [
      "army_in_active_war"
    ],
    "exclusions": []
  },
  {
    "id": "campaign_scouts_report",
    "name": "Scouts Report Movement",
    "category": "CAMPAIGN",
    "tone": "GOOD",
    "baseChance": 0.22,
    "weight": 0.9,
    "cooldownHours": 36,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "scout_report",
        "label": "A bounded scout report is delivered",
        "weight": 1,
        "effects": [
          {
            "type": "PLAYER_KNOWLEDGE",
            "playerBinding": "playerId",
            "subjectBinding": "warId",
            "summary": "Scouts report military movement connected to the current campaign.",
            "kind": "event",
            "confidence": "medium"
          }
        ]
      }
    ],
    "requirements": [
      "army_in_active_war",
      "player_owned_army"
    ],
    "exclusions": []
  },
  {
    "id": "campaign_villagers_help",
    "name": "Villagers Provide Information",
    "category": "CAMPAIGN",
    "tone": "GOOD",
    "baseChance": 0.18,
    "weight": 0.7,
    "cooldownHours": 72,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "local_report",
        "label": "Local information reaches the army",
        "weight": 1,
        "effects": [
          {
            "type": "PLAYER_KNOWLEDGE",
            "playerBinding": "playerId",
            "subjectBinding": "warId",
            "summary": "Local villagers provided useful campaign information.",
            "kind": "event",
            "confidence": "low"
          }
        ]
      }
    ],
    "requirements": [
      "army_in_active_war",
      "player_owned_army"
    ],
    "exclusions": []
  },
  {
    "id": "campaign_commander_disagreement",
    "name": "Commander Disagreement",
    "category": "CAMPAIGN",
    "tone": "CONTEXTUAL",
    "baseChance": 0.18,
    "weight": 0.8,
    "cooldownHours": 72,
    "severity": "moderate",
    "resolutionMode": "RNG",
    "outcomes": [
      {
        "id": "resolved",
        "label": "The disagreement is settled without lasting damage",
        "weight": 2,
        "effects": [
          {
            "type": "NO_OP",
            "summary": "Command disagreement resolved."
          }
        ]
      },
      {
        "id": "morale_cost",
        "label": "The dispute harms confidence",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_MORALE_SET",
            "targetBinding": "armyId",
            "value": "low"
          }
        ]
      }
    ],
    "requirements": [
      "army_in_active_war"
    ],
    "exclusions": []
  },
  {
    "id": "campaign_equipment_breakdown",
    "name": "Equipment Breakdown",
    "category": "CAMPAIGN",
    "tone": "BAD",
    "baseChance": 0.2,
    "weight": 0.8,
    "cooldownHours": 48,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "repair_cost",
        "label": "Repairs consume campaign stores",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_SUPPLY_DELTA",
            "targetBinding": "armyId",
            "amount": -65
          }
        ]
      }
    ],
    "requirements": [
      "army_in_active_war"
    ],
    "exclusions": []
  },
  {
    "id": "battle_morale_surge",
    "name": "Morale Surge",
    "category": "BATTLE",
    "tone": "GOOD",
    "baseChance": 0.3,
    "weight": 1.0,
    "cooldownHours": 8,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "surge",
        "label": "The attacker gains momentum",
        "weight": 1,
        "effects": [
          {
            "type": "BATTLE_MOMENTUM_DELTA",
            "targetBinding": "battleId",
            "amount": 8
          }
        ]
      }
    ],
    "requirements": [
      "active_battle"
    ],
    "exclusions": []
  },
  {
    "id": "battle_commander_injured",
    "name": "Commander Temporarily Injured",
    "category": "BATTLE",
    "tone": "BAD",
    "baseChance": 0.18,
    "weight": 0.7,
    "cooldownHours": 12,
    "severity": "major",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "command_shock",
        "label": "The affected side suffers morale pressure",
        "weight": 1,
        "effects": [
          {
            "type": "BATTLE_MORALE_PRESSURE_DELTA",
            "targetBinding": "battleId",
            "side": "attacker",
            "amount": 7
          }
        ]
      }
    ],
    "requirements": [
      "active_battle"
    ],
    "exclusions": []
  },
  {
    "id": "battle_reserve_moment",
    "name": "Reserve Finds an Opening",
    "category": "BATTLE",
    "tone": "GOOD",
    "baseChance": 0.22,
    "weight": 0.8,
    "cooldownHours": 10,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "opening",
        "label": "The defender stabilizes the front",
        "weight": 1,
        "effects": [
          {
            "type": "BATTLE_MOMENTUM_DELTA",
            "targetBinding": "battleId",
            "amount": -7
          }
        ]
      }
    ],
    "requirements": [
      "active_battle"
    ],
    "exclusions": []
  },
  {
    "id": "battle_formation_confusion",
    "name": "Formation Confusion",
    "category": "BATTLE",
    "tone": "BAD",
    "baseChance": 0.26,
    "weight": 0.9,
    "cooldownHours": 8,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "confusion",
        "label": "Attacker morale pressure rises",
        "weight": 1,
        "effects": [
          {
            "type": "BATTLE_MORALE_PRESSURE_DELTA",
            "targetBinding": "battleId",
            "side": "attacker",
            "amount": 5
          }
        ]
      }
    ],
    "requirements": [
      "active_battle"
    ],
    "exclusions": []
  },
  {
    "id": "battle_terrain_discovery",
    "name": "Terrain Advantage Discovered",
    "category": "BATTLE",
    "tone": "CONTEXTUAL",
    "baseChance": 0.2,
    "weight": 0.8,
    "cooldownHours": 12,
    "severity": "moderate",
    "resolutionMode": "RNG",
    "outcomes": [
      {
        "id": "attacker_advantage",
        "label": "Attackers exploit the terrain",
        "weight": 1,
        "effects": [
          {
            "type": "BATTLE_MOMENTUM_DELTA",
            "targetBinding": "battleId",
            "amount": 6
          }
        ]
      },
      {
        "id": "defender_advantage",
        "label": "Defenders exploit the terrain",
        "weight": 1,
        "effects": [
          {
            "type": "BATTLE_MOMENTUM_DELTA",
            "targetBinding": "battleId",
            "amount": -6
          }
        ]
      }
    ],
    "requirements": [
      "active_battle"
    ],
    "exclusions": []
  },
  {
    "id": "battle_messenger_delayed",
    "name": "Battle Messenger Delayed",
    "category": "BATTLE",
    "tone": "BAD",
    "baseChance": 0.16,
    "weight": 0.6,
    "cooldownHours": 10,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "delay",
        "label": "Defender morale pressure rises",
        "weight": 1,
        "effects": [
          {
            "type": "BATTLE_MORALE_PRESSURE_DELTA",
            "targetBinding": "battleId",
            "side": "defender",
            "amount": 4
          }
        ]
      }
    ],
    "requirements": [
      "active_battle"
    ],
    "exclusions": []
  },
  {
    "id": "battle_unit_panic",
    "name": "Unit Panic",
    "category": "BATTLE",
    "tone": "BAD",
    "baseChance": 0.18,
    "weight": 0.7,
    "cooldownHours": 12,
    "severity": "major",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "panic",
        "label": "Defender morale pressure rises sharply",
        "weight": 1,
        "effects": [
          {
            "type": "BATTLE_MORALE_PRESSURE_DELTA",
            "targetBinding": "battleId",
            "side": "defender",
            "amount": 9
          }
        ]
      }
    ],
    "requirements": [
      "active_battle"
    ],
    "exclusions": []
  },
  {
    "id": "siege_defender_shortage",
    "name": "Defender Food Shortage",
    "category": "SIEGE",
    "tone": "BAD",
    "baseChance": 0.24,
    "weight": 1.0,
    "cooldownHours": 36,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "shortage",
        "label": "The shortage is recorded as siege pressure",
        "weight": 1,
        "effects": [
          {
            "type": "SIEGE_HISTORY_NOTE",
            "targetBinding": "siegeId",
            "summary": "Defender food shortage increased pressure inside the settlement."
          }
        ]
      }
    ],
    "requirements": [
      "active_siege"
    ],
    "exclusions": []
  },
  {
    "id": "siege_equipment_damaged",
    "name": "Siege Equipment Damaged",
    "category": "SIEGE",
    "tone": "BAD",
    "baseChance": 0.2,
    "weight": 0.9,
    "cooldownHours": 36,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "damage",
        "label": "Attackers lose campaign stores to repairs",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_SUPPLY_DELTA",
            "targetBinding": "armyId",
            "amount": -90
          },
          {
            "type": "SIEGE_HISTORY_NOTE",
            "targetBinding": "siegeId",
            "summary": "Siege equipment was damaged and required repairs."
          }
        ]
      }
    ],
    "requirements": [
      "active_siege"
    ],
    "exclusions": []
  },
  {
    "id": "siege_illness",
    "name": "Illness in the Siege Camp",
    "category": "SIEGE",
    "tone": "BAD",
    "baseChance": 0.18,
    "weight": 0.8,
    "cooldownHours": 48,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "illness",
        "label": "The besieging army suffers reduced morale",
        "weight": 1,
        "effects": [
          {
            "type": "ARMY_MORALE_SET",
            "targetBinding": "armyId",
            "value": "low"
          },
          {
            "type": "SIEGE_HISTORY_NOTE",
            "targetBinding": "siegeId",
            "summary": "Illness reduced effectiveness in the siege camp."
          }
        ]
      }
    ],
    "requirements": [
      "active_siege"
    ],
    "exclusions": []
  },
  {
    "id": "siege_wall_weakness",
    "name": "Wall Weakness Discovered",
    "category": "SIEGE",
    "tone": "GOOD",
    "baseChance": 0.18,
    "weight": 0.8,
    "cooldownHours": 48,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "weakness",
        "label": "Engineers identify a structural weakness",
        "weight": 1,
        "effects": [
          {
            "type": "SIEGE_HISTORY_NOTE",
            "targetBinding": "siegeId",
            "summary": "Engineers identified a weakness in the fortifications."
          }
        ]
      }
    ],
    "requirements": [
      "active_siege"
    ],
    "exclusions": []
  },
  {
    "id": "siege_sympathizer_report",
    "name": "Local Sympathizer Sends Information",
    "category": "SIEGE",
    "tone": "GOOD",
    "baseChance": 0.16,
    "weight": 0.7,
    "cooldownHours": 72,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "report",
        "label": "A limited report reaches the besieging side",
        "weight": 1,
        "effects": [
          {
            "type": "PLAYER_KNOWLEDGE",
            "playerBinding": "playerId",
            "subjectBinding": "siegeId",
            "summary": "A local sympathizer provided information about the ongoing siege.",
            "kind": "event",
            "confidence": "medium"
          }
        ]
      }
    ],
    "requirements": [
      "active_siege",
      "player_owned_army"
    ],
    "exclusions": []
  },
  {
    "id": "political_order_dispute",
    "name": "Lord Disputes a Ruler Order",
    "category": "POLITICAL",
    "tone": "CONTEXTUAL",
    "baseChance": 0.24,
    "weight": 1.0,
    "cooldownHours": 48,
    "severity": "moderate",
    "resolutionMode": "GM_NPC_DECISION",
    "outcomes": [
      {
        "id": "lord_yields",
        "label": "The lord yields after consideration",
        "weight": 2,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": 2
          }
        ]
      },
      {
        "id": "lord_resists",
        "label": "The dispute deepens",
        "weight": 1,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": -4
          }
        ]
      }
    ],
    "requirements": [
      "major_lord"
    ],
    "exclusions": []
  },
  {
    "id": "political_old_grievance",
    "name": "Old Grievance Resurfaces",
    "category": "POLITICAL",
    "tone": "BAD",
    "baseChance": 0.18,
    "weight": 0.8,
    "cooldownHours": 72,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "resentment",
        "label": "The lord's loyalty slips",
        "weight": 1,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": -5
          }
        ]
      }
    ],
    "requirements": [
      "major_lord"
    ],
    "exclusions": []
  },
  {
    "id": "political_favor_request",
    "name": "Influential Lord Requests a Favor",
    "category": "POLITICAL",
    "tone": "CONTEXTUAL",
    "baseChance": 0.18,
    "weight": 0.8,
    "cooldownHours": 72,
    "severity": "moderate",
    "resolutionMode": "PLAYER_DECISION",
    "outcomes": [
      {
        "id": "grant_favor",
        "label": "Grant the request",
        "weight": 1,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": 6
          }
        ]
      },
      {
        "id": "deny_favor",
        "label": "Deny the request",
        "weight": 1,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": -4
          }
        ]
      }
    ],
    "requirements": [
      "major_lord",
      "player_kingdom"
    ],
    "exclusions": []
  },
  {
    "id": "political_loyalty_crisis",
    "name": "Loyalty Crisis",
    "category": "POLITICAL",
    "tone": "BAD",
    "baseChance": 0.2,
    "weight": 0.9,
    "cooldownHours": 72,
    "severity": "major",
    "resolutionMode": "GM_NPC_DECISION",
    "outcomes": [
      {
        "id": "stabilizes",
        "label": "The lord remains aligned",
        "weight": 1,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": 3
          }
        ]
      },
      {
        "id": "worsens",
        "label": "The crisis worsens",
        "weight": 1,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": -7
          }
        ]
      }
    ],
    "requirements": [
      "low_loyalty_lord"
    ],
    "exclusions": []
  },
  {
    "id": "political_public_insult",
    "name": "Public Insult Dispute",
    "category": "POLITICAL",
    "tone": "BAD",
    "baseChance": 0.16,
    "weight": 0.7,
    "cooldownHours": 72,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "insult",
        "label": "Personal relations worsen",
        "weight": 1,
        "effects": [
          {
            "type": "RELATIONSHIP_DELTA",
            "fromBinding": "lordId",
            "toBinding": "rulerId",
            "amount": -10
          }
        ]
      }
    ],
    "requirements": [
      "major_lord"
    ],
    "exclusions": []
  },
  {
    "id": "political_promise_questioned",
    "name": "Promise Questioned",
    "category": "POLITICAL",
    "tone": "CONTEXTUAL",
    "baseChance": 0.18,
    "weight": 0.7,
    "cooldownHours": 72,
    "severity": "minor",
    "resolutionMode": "PLAYER_DECISION",
    "outcomes": [
      {
        "id": "reaffirm",
        "label": "Reaffirm the promise",
        "weight": 1,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": 3
          }
        ]
      },
      {
        "id": "dismiss",
        "label": "Dismiss the concern",
        "weight": 1,
        "effects": [
          {
            "type": "LORD_LOYALTY_DELTA",
            "targetBinding": "lordId",
            "amount": -3
          }
        ]
      }
    ],
    "requirements": [
      "major_lord",
      "player_kingdom"
    ],
    "exclusions": []
  },
  {
    "id": "economic_good_harvest",
    "name": "Good Harvest",
    "category": "ECONOMIC",
    "tone": "GOOD",
    "baseChance": 0.2,
    "weight": 1.0,
    "cooldownHours": 96,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "harvest",
        "label": "Food reserves improve",
        "weight": 1,
        "effects": [
          {
            "type": "KINGDOM_FOOD_DELTA",
            "targetBinding": "kingdomId",
            "amount": 8
          }
        ]
      }
    ],
    "requirements": [
      "kingdom"
    ],
    "exclusions": []
  },
  {
    "id": "economic_poor_harvest",
    "name": "Poor Harvest",
    "category": "ECONOMIC",
    "tone": "BAD",
    "baseChance": 0.18,
    "weight": 0.9,
    "cooldownHours": 96,
    "severity": "moderate",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "shortfall",
        "label": "Food reserves fall",
        "weight": 1,
        "effects": [
          {
            "type": "KINGDOM_FOOD_DELTA",
            "targetBinding": "kingdomId",
            "amount": -7
          }
        ]
      }
    ],
    "requirements": [
      "kingdom"
    ],
    "exclusions": []
  },
  {
    "id": "economic_mine_disruption",
    "name": "Mine Disruption",
    "category": "ECONOMIC",
    "tone": "BAD",
    "baseChance": 0.14,
    "weight": 0.7,
    "cooldownHours": 96,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "lost_revenue",
        "label": "Treasury income is disrupted",
        "weight": 1,
        "effects": [
          {
            "type": "KINGDOM_TREASURY_DELTA",
            "targetBinding": "kingdomId",
            "amount": -350
          }
        ]
      }
    ],
    "requirements": [
      "kingdom"
    ],
    "exclusions": []
  },
  {
    "id": "economic_merchant_activity",
    "name": "Merchant Activity Increases",
    "category": "ECONOMIC",
    "tone": "GOOD",
    "baseChance": 0.17,
    "weight": 0.8,
    "cooldownHours": 72,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "market_revenue",
        "label": "Treasury gains from trade",
        "weight": 1,
        "effects": [
          {
            "type": "KINGDOM_TREASURY_DELTA",
            "targetBinding": "kingdomId",
            "amount": 300
          }
        ]
      }
    ],
    "requirements": [
      "kingdom"
    ],
    "exclusions": []
  },
  {
    "id": "economic_local_production_problem",
    "name": "Local Production Problem",
    "category": "ECONOMIC",
    "tone": "BAD",
    "baseChance": 0.16,
    "weight": 0.7,
    "cooldownHours": 72,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "instability",
        "label": "Local disruption slightly harms stability",
        "weight": 1,
        "effects": [
          {
            "type": "KINGDOM_STABILITY_DELTA",
            "targetBinding": "kingdomId",
            "amount": -3
          }
        ]
      }
    ],
    "requirements": [
      "kingdom"
    ],
    "exclusions": []
  },
  {
    "id": "diplomatic_envoy_delayed",
    "name": "Envoy Delayed",
    "category": "DIPLOMATIC",
    "tone": "BAD",
    "baseChance": 0.16,
    "weight": 0.7,
    "cooldownHours": 48,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "delay_recorded",
        "label": "The delay creates diplomatic friction",
        "weight": 1,
        "effects": [
          {
            "type": "NO_OP",
            "summary": "Diplomatic delivery was delayed by circumstances."
          }
        ]
      }
    ],
    "requirements": [
      "active_or_proposed_agreement"
    ],
    "exclusions": []
  },
  {
    "id": "diplomatic_misunderstanding",
    "name": "Diplomatic Misunderstanding",
    "category": "DIPLOMATIC",
    "tone": "BAD",
    "baseChance": 0.14,
    "weight": 0.7,
    "cooldownHours": 72,
    "severity": "minor",
    "resolutionMode": "AUTO",
    "outcomes": [
      {
        "id": "friction",
        "label": "Relations cool slightly",
        "weight": 1,
        "effects": [
          {
            "type": "RELATIONSHIP_DELTA",
            "fromBinding": "sourceCharacterId",
            "toBinding": "targetCharacterId",
            "amount": -5
          }
        ]
      }
    ],
    "requirements": [
      "active_or_proposed_agreement"
    ],
    "exclusions": []
  },
  {
    "id": "diplomatic_peace_feeler",
    "name": "Foreign Peace Feeler",
    "category": "DIPLOMATIC",
    "tone": "CONTEXTUAL",
    "baseChance": 0.13,
    "weight": 0.6,
    "cooldownHours": 96,
    "severity": "moderate",
    "resolutionMode": "PLAYER_DECISION",
    "outcomes": [
      {
        "id": "hear_them",
        "label": "Hear the proposal",
        "weight": 1,
        "effects": [
          {
            "type": "NO_OP",
            "summary": "The ruler agrees to hear further peace terms."
          }
        ]
      },
      {
        "id": "dismiss",
        "label": "Dismiss the approach",
        "weight": 1,
        "effects": [
          {
            "type": "NO_OP",
            "summary": "The ruler dismisses the peace feeler."
          }
        ]
      }
    ],
    "requirements": [
      "war_pressure",
      "player_kingdom"
    ],
    "exclusions": []
  },
  {
    "id": "diplomatic_allied_support_request",
    "name": "Allied Request for Support",
    "category": "DIPLOMATIC",
    "tone": "CONTEXTUAL",
    "baseChance": 0.15,
    "weight": 0.7,
    "cooldownHours": 72,
    "severity": "moderate",
    "resolutionMode": "PLAYER_DECISION",
    "outcomes": [
      {
        "id": "acknowledge",
        "label": "Acknowledge the request",
        "weight": 1,
        "effects": [
          {
            "type": "NO_OP",
            "summary": "The ruler acknowledges the allied request; armies still require normal orders."
          }
        ]
      },
      {
        "id": "decline",
        "label": "Decline immediate support",
        "weight": 1,
        "effects": [
          {
            "type": "NO_OP",
            "summary": "The ruler declines immediate support."
          }
        ]
      }
    ],
    "requirements": [
      "active_alliance",
      "player_kingdom"
    ],
    "exclusions": []
  }
];

export const EVENT_DEFINITION_BY_ID: Record<string, EventDefinition> =
  Object.fromEntries(
    EVENT_DEFINITIONS.map((definition) => [definition.id, definition])
  );

export const EVENT_LIBRARY_COUNTS = {
  TRAVEL: EVENT_DEFINITIONS.filter((event) => event.category === "TRAVEL").length,
  CAMPAIGN: EVENT_DEFINITIONS.filter((event) => event.category === "CAMPAIGN").length,
  BATTLE: EVENT_DEFINITIONS.filter((event) => event.category === "BATTLE").length,
  SIEGE: EVENT_DEFINITIONS.filter((event) => event.category === "SIEGE").length,
  POLITICAL: EVENT_DEFINITIONS.filter((event) => event.category === "POLITICAL").length,
  ECONOMIC: EVENT_DEFINITIONS.filter((event) => event.category === "ECONOMIC").length,
  DIPLOMATIC: EVENT_DEFINITIONS.filter((event) => event.category === "DIPLOMATIC").length,
} as const;
