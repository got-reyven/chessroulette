import "../styles/ambient.css";

export function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__base" />
      <div className="ambient__mesh ambient__mesh--a" />
      <div className="ambient__mesh ambient__mesh--b" />
      <div className="ambient__grid" />
      <div className="ambient__orb ambient__orb--1" />
      <div className="ambient__orb ambient__orb--2" />
      <div className="ambient__orb ambient__orb--3" />
      <div className="ambient__vignette" />
    </div>
  );
}
