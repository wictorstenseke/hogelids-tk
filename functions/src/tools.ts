import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_available_times',
      description:
        'Visar lediga tider för tennisbanan ett visst datum. Returnerar en lista med lediga tidsintervall.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Datum i format YYYY-MM-DD',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_my_bookings',
      description:
        'Visar användarens kommande bokningar. Returnerar en lista med bokningar.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_ladder_opponents',
      description:
        'Visar vilka spelare i stegen som användaren kan utmana. Returnerar en lista med utmaningsbara spelare med position och namn.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description:
        'Föreslår en ny bokning av tennisbanan. Visar ett bekräftelsekort för användaren.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Datum i format YYYY-MM-DD',
          },
          startTime: {
            type: 'string',
            description: 'Starttid i format HH:MM',
          },
          endTime: {
            type: 'string',
            description: 'Sluttid i format HH:MM',
          },
        },
        required: ['date', 'startTime', 'endTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_ladder_match',
      description:
        'Föreslår en stegmatch mot en annan spelare. Visar ett bekräftelsekort för användaren. Kräver att list_ladder_opponents anropats först för att hämta ladderId.',
      parameters: {
        type: 'object',
        properties: {
          ladderId: {
            type: 'string',
            description:
              'ID för den aktiva stegen (från list_ladder_opponents)',
          },
          opponentId: {
            type: 'string',
            description: 'Motståndarens användar-ID',
          },
          opponentName: {
            type: 'string',
            description: 'Motståndarens namn',
          },
          date: {
            type: 'string',
            description: 'Datum i format YYYY-MM-DD',
          },
          startTime: {
            type: 'string',
            description: 'Starttid i format HH:MM',
          },
          endTime: {
            type: 'string',
            description: 'Sluttid i format HH:MM',
          },
        },
        required: [
          'ladderId',
          'opponentId',
          'opponentName',
          'date',
          'startTime',
          'endTime',
        ],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_booking',
      description:
        'Föreslår att ta bort en bokning. Visar ett bekräftelsekort för användaren.',
      parameters: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'ID för bokningen som ska tas bort',
          },
          bookingSummary: {
            type: 'string',
            description:
              'Kort sammanfattning av bokningen (datum och tid) för bekräftelsekortet',
          },
        },
        required: ['bookingId', 'bookingSummary'],
      },
    },
  },
]
