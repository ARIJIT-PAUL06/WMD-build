import React from 'react';
import { Search, RefreshCw, MapPin } from 'lucide-react';

export default function HeatmapSearchBar({
  searchContainerRef,
  searchQuery,
  handleSearchInput,
  setShowSearchDropdown,
  showSearchDropdown,
  searchResults,
  isSearching,
  setSearchQuery,
  setSearchResults,
  handleSelectSearchResult,
}) {
  return (
    <div
      ref={searchContainerRef}
      style={{
        position: 'relative',
        zIndex: 110,
        minWidth: '220px',
        flex: '1 1 220px',
        maxWidth: '320px',
      }}
    >
      <div
        className="glass-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '9999px',
          padding: '4px 12px',
        }}
      >
        <Search size={12} color="#94a3b8" />
        <input
          type="text"
          placeholder="Search house, society, PIN code, landmark across India..."
          value={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) setShowSearchDropdown(true);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '0.73rem',
            width: '100%',
          }}
        />
        {isSearching && <RefreshCw size={11} className="animate-spin" color="#38bdf8" />}
        {searchQuery && !isSearching && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowSearchDropdown(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: '0.75rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {showSearchDropdown && searchResults.length > 0 && (
        <div
          className="glass-panel-master"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            borderRadius: '12px',
            overflow: 'hidden',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {searchResults.map((f) => (
            <div
              key={f.id}
              onClick={() => handleSelectSearchResult(f)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '0.74rem',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <MapPin size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.text}</strong>
                  {f.badge && (
                    <span style={{
                      fontSize: '0.6rem',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      {f.badge}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.place_name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
