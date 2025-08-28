import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TaskProductProposalDto {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  notes?: string | null;
  insertDateUtc?: string;
  isActive: boolean;
  isDeleted: boolean;
}

interface HardwarePopupProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: TaskProductProposalDto[];
  triggerRect: DOMRect | null;
  isHardwareProposal: (p: TaskProductProposalDto) => boolean;
}

const HardwarePopup: React.FC<HardwarePopupProps> = ({
  isOpen,
  onClose,
  proposals,
  triggerRect,
  isHardwareProposal,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    x: number;
    y: number;
    arrow: 'top' | 'bottom' | 'left' | 'right';
  }>({ 
    x: triggerRect ? triggerRect.left : 0, 
    y: triggerRect ? triggerRect.bottom + 12 : 0, 
    arrow: 'top'
  });
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    if (!isOpen || !triggerRect) return;

    const calculatePosition = () => {
      const popup = popupRef.current;
      if (!popup) {
        // Riprova se il popup non è ancora disponibile
        requestAnimationFrame(calculatePosition);
        return;
      }

      const popupRect = popup.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = triggerRect.left + triggerRect.width / 2 - popupRect.width / 2;
      let y = triggerRect.bottom + 12;
      let arrow: "top" | "bottom" | "left" | "right" = "top" as const;

      // Adjust horizontal position if popup goes out of viewport
      if (x < 10) {
        x = 10;
      } else if (x + popupRect.width > viewportWidth - 10) {
        x = viewportWidth - popupRect.width - 10;
      }

      // Check if popup goes below viewport, position it above if needed
      if (y + popupRect.height > viewportHeight - 10) {
        y = triggerRect.top - popupRect.height - 12;
        arrow = 'bottom';
        
        // If still not fitting, try left/right
        if (y < 10) {
          y = triggerRect.top + triggerRect.height / 2 - popupRect.height / 2;
          
          if (triggerRect.right + 12 + popupRect.width < viewportWidth) {
            x = triggerRect.right + 12;
            arrow = 'left';
          } else {
            x = triggerRect.left - popupRect.width - 12;
            arrow = 'right';
          }
        }
      }

      setPosition({ x, y, arrow });
      setIsPositioned(true);
    };

    // Reset positioning state
    setIsPositioned(false);
    
    // Use requestAnimationFrame for smoother positioning
    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(calculatePosition);
    });
    
    // Recalculate on window resize/scroll
    const handleResize = () => {
      setIsPositioned(false);
      requestAnimationFrame(() => requestAnimationFrame(calculatePosition));
    };
    
    const handleScroll = () => {
      // Chiudi il popup invece di riposizionarlo durante lo scroll
      onClose();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    // Ascolta anche lo scroll sui contenitori scrollabili della tabella
    const tableContainers = document.querySelectorAll('.table-responsive, .container-fluid, .modal-body');
    tableContainers.forEach(container => {
      container.addEventListener('scroll', handleScroll, true);
    });
    
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      
      // Rimuovi i listener dai contenitori
      tableContainers.forEach(container => {
        container.removeEventListener('scroll', handleScroll, true);
      });
    };
  }, [isOpen, triggerRect]);

  if (!isOpen || !triggerRect) return null;

  const hardwareList = proposals.filter(p => !p.isDeleted && isHardwareProposal(p));

  const popupContent = (
    <>
      {/* Overlay per chiudere cliccando fuori */}
      <div className="hw-popover-overlay" onClick={onClose} />
      
      <div
        ref={popupRef}
        className="hw-popover-portal"
        style={{
          left: position.x,
          top: position.y,
          opacity: isPositioned ? 1 : 0,
          transition: isPositioned ? 'opacity 0.2s ease-out' : 'none',
        }}
      >
        <div className="hw-popover-header">
          <strong>Prodotti hardware</strong>
          <button
            type="button"
            className="btn-close"
            aria-label="Chiudi"
            onClick={onClose}
          />
        </div>
        <div className="hw-popover-body">
          {hardwareList.length === 0 ? (
            <small className="text-muted">Nessun prodotto hardware</small>
          ) : (
            <ul className="mb-0 hw-list">
              {hardwareList.map((p) => (
                <li key={p.id}>
                  <span className="name">{p.productName}</span>
                  {typeof p.quantity === 'number' && p.quantity > 1 && (
                    <span className="qty"> × {p.quantity}</span>
                  )}
                  {typeof p.unitPrice === 'number' && (
                    <span className="price">
                      • € {(p.unitPrice * (p.quantity ?? 1)).toFixed(2)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className={`hw-popover-arrow hw-popover-arrow--${position.arrow}`} aria-hidden="true" />
      </div>
    </>
  );

  // Render usando Portal nel body
  return createPortal(popupContent, document.body);
};

export default HardwarePopup;