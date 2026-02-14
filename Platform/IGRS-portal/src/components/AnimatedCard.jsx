import React, { useState, useEffect, useRef } from "react";

const AnimatedCard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style jsx>{`
        .card-3d {
          transform-style: preserve-3d;
          transition: all 0.3s ease;
          position: relative;
          cursor: pointer;
        }

        .card-3d:hover {
          transform: rotateX(15deg) rotateY(15deg) translateZ(20px) scale(1.05);
        }
      `}</style>

      <section className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div 
            ref={cardRef}
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="flex justify-center">
              <div 
                className="card-3d relative w-80 h-80"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => {
                  console.log("3D Card clicked!");
                }}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  boxShadow: isHovered 
                    ? "0 20px 40px rgba(0,0,0,0.2)" 
                    : "0 10px 20px rgba(0,0,0,0.1)"
                }}
              >
                {/* Logo Image Only */}
                <div 
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px"
                  }}
                >
                  <img 
                    src="/logo.png" 
                    alt="Governance Logo"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AnimatedCard;
