import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import CommanderDetail from './pages/CommanderDetail'
import DeckBuilder from './pages/DeckBuilder'
import MyDecks from './pages/MyDecks'
import SearchResults from './pages/SearchResults'
import News from './pages/News'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/commander/:name" element={<CommanderDetail />} />
          <Route path="/builder" element={<DeckBuilder />} />
          <Route path="/builder/:deckId" element={<DeckBuilder />} />
          <Route path="/decks" element={<MyDecks />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/news" element={<News />} />
        </Routes>
      </main>
    </>
  )
}
