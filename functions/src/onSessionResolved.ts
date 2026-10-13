import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const db = admin.firestore();

// Element combinations lookup table
const ELEMENT_COMBINATIONS: Record<string, string> = {
  "FIRE_FIRE": "Double Fire (Volcanic Radiance & High Action)",
  "FIRE_WATER": "Fire + Water (Steam, Deep Passion & Emotional Volatility)",
  "FIRE_AIR": "Fire + Air (Spreading Flame, Visionary Intellect)",
  "FIRE_EARTH": "Fire + Earth (Hearthstone, Grounded Ambition)",
  "WATER_WATER": "Double Water (Abyssal Intuition & Psychic Resonance)",
  "WATER_AIR": "Water + Air (Mist, Poetic Expression & Subconscious Insight)",
  "WATER_EARTH": "Water + Earth (Fertile Soil, Enduring Manifestation)",
  "AIR_AIR": "Double Air (Mental Telepathy & Abstract Philosophy)",
  "AIR_EARTH": "Air + Earth (Structured Architecture & Practical Logic)",
  "EARTH_EARTH": "Double Earth (Tectonic Stability & Permanent Foundations)",
};

export const onSessionResolved = onDocumentUpdated(
  {
    document: "coop_sessions/{sessionId}",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    // Guard 1: Trigger ONLY when status transitions into "RESOLVED"
    const transitionedToResolved = 
      beforeData.status !== "RESOLVED" && afterData.status === "RESOLVED";

    if (!transitionedToResolved) {
      return;
    }

    // Guard 2: Idempotency Check — Never re-calculate if payload already exists
    if (afterData.synthesisPayload) {
      return;
    }

    const sessionId = event.params.sessionId;
    const sessionRef = db.collection("coop_sessions").doc(sessionId);

    try {
      await db.runTransaction(async (transaction) => {
        const sessionDoc = await transaction.get(sessionRef);
        if (!sessionDoc.exists) {
          throw new Error(`Session ${sessionId} not found`);
        }

        const data = sessionDoc.data()!;
        if (data.synthesisPayload) {
          return; // Concurrently resolved
        }

        // Fetch both private draw documents securely
        const initiatorDrawRef = sessionRef.collection("draws").doc(data.initiatorUid);
        const recipientDrawRef = sessionRef.collection("draws").doc(data.recipientUid);

        const [initiatorSnap, recipientSnap] = await Promise.all([
          transaction.get(initiatorDrawRef),
          transaction.get(recipientDrawRef),
        ]);

        if (!initiatorSnap.exists || !recipientSnap.exists) {
          throw new Error("Cannot synthesize: One or both card draws are missing.");
        }

        const cardA = initiatorSnap.data()!.card;
        const cardB = recipientSnap.data()!.card;

        // --- COMPOSITE SYNTHESIS ALGORITHM ---
        const sortedElements = [cardA.element, cardB.element].sort();
        const comboKey = `${sortedElements[0]}_${sortedElements[1]}`;
        const elementalAlchemy = ELEMENT_COMBINATIONS[comboKey] || "Universal Equilibrium";

        const arcanaDistance = Math.abs(cardA.cardId - cardB.cardId);
        let resonanceScore = 100 - (arcanaDistance * 2.8);
        if (cardA.isReversed) resonanceScore -= 7;
        if (cardB.isReversed) resonanceScore -= 7;
        resonanceScore = Math.max(35, Math.min(99, Math.round(resonanceScore)));

        const relationalTheme = `Synthesis of ${cardA.name} and ${cardB.name}`;
        const actionableInsight = `Anchor node (${cardA.name}) sets the dynamic tension; catalyst node (${cardB.name}) unlocks resolution.`;

        // Atomically reveal both cards and store synthesis payload
        transaction.update(sessionRef, {
          revealedCards: {
            initiatorCard: cardA,
            recipientCard: cardB,
          },
          synthesisPayload: {
            compositeResonanceScore: resonanceScore,
            elementalAlchemy,
            relationalTheme,
            actionableInsight,
            calculatedAt: Timestamp.now(),
          },
          status: "RESOLVED",
        });
      });

      console.log(`[Co-Op Tarot] Successfully synthesized session: ${sessionId}`);
    } catch (error) {
      console.error(`[Co-Op Tarot] Failed synthesizing session ${sessionId}:`, error);
      throw error;
    }
  }
);
