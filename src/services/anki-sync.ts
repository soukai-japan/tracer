import { db, type AnkiDailyReview } from './db'

const ANKI_SETTINGS_ID = 'anki_settings'

interface AnkiConnectResponse<T> {
  result: T
  error: string | null
}

async function getAnkiConnectUrl(): Promise<string | undefined> {
  const settings = await db.settings.get(ANKI_SETTINGS_ID)
  return settings?.ankiConnectUrl
}

async function callAnkiConnect<T>(
  action: string,
  params: Record<string, any> = {},
): Promise<AnkiConnectResponse<T>> {
  const ankiConnectUrl = await getAnkiConnectUrl()
  if (!ankiConnectUrl) {
    throw new Error('Anki Connect URL not configured.')
  }

  try {
    const response = await fetch(ankiConnectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        version: 6, // AnkiConnect API version
        params,
      }),
      mode: 'cors', // 明确指定 CORS 模式
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: AnkiConnectResponse<T> = await response.json()
    if (data.error) {
      throw new Error(`AnkiConnect error: ${data.error}`)
    }
    return data
  } catch (error) {
    console.error('Error calling AnkiConnect:', error)
    throw error
  }
}

export async function syncAnkiDailyReviews(): Promise<void> {
  try {
    const response = await callAnkiConnect<[string, number][]>('getNumCardsReviewedByDay')
    const dailyReviews = response.result

    for (const [dateString, reviewedCards] of dailyReviews) {
      const existingReview = await db.ankiDailyReviews.where('date').equals(dateString).first()

      if (existingReview) {
        if (existingReview.reviewedCards !== reviewedCards) {
          await db.ankiDailyReviews.update(existingReview.id!, { reviewedCards: reviewedCards })
          console.log(`Updated Anki daily review for ${dateString}: ${reviewedCards} cards.`)
        }
      } else {
        const newReview: AnkiDailyReview = {
          date: dateString,
          reviewedCards: reviewedCards,
          createdAt: new Date(), // Use current date for creation timestamp
        }
        await db.ankiDailyReviews.add(newReview)
        console.log(`Added Anki daily review for ${dateString}: ${reviewedCards} cards.`)
      }
    }
  } catch (error) {
    console.error('Failed to sync Anki daily reviews:', error)
    throw error
  }
}

// Optionally, you can add a function to get all daily reviews
export async function getAllAnkiDailyReviews(): Promise<AnkiDailyReview[]> {
  return db.ankiDailyReviews.toArray()
}
