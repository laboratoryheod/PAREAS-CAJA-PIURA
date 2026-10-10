// Adaptado de cult-ui (MIT) · family-button: colores de la Caja y etiqueta accesible.
"use client"

import { FC, ReactNode, useState } from "react"
import { IcCerrar as XIcon, IcMas as PlusIcon } from "@/components/iconos"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const CONTAINER_SIZE = 200

interface FamilyButtonProps {
  children: React.ReactNode
  className?: string
  etiqueta?: string
}

const FamilyButton: React.FC<FamilyButtonProps> = ({ children, className, etiqueta = "Abrir menú" }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const toggleExpand = () => setIsExpanded(!isExpanded)

  return (
    <div
      className={cn(
        "rounded-[24px] border border-black/10 shadow-[0_12px_32px_rgba(0,40,90,0.35)]",
        "bg-gradient-to-b from-caja-medio to-caja-header",
        className,
        isExpanded
          ? "w-[204px] bg-gradient-to-b dark:from-stone-900 dark:to-neutral-900/80"
          : "bg-gradient-to-b dark:from-neutral-900 dark:to-stone-950"
      )}
    >
      <div className="rounded-[23px] border border-black/10">
        <div className="rounded-[22px] border border-white/50 dark:border-stone-800">
          <div className="flex items-center justify-center rounded-[21px] border border-neutral-950/20">
            <FamilyButtonContainer
              isExpanded={isExpanded}
              toggleExpand={toggleExpand}
              etiqueta={etiqueta}
            >
              {isExpanded ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: {
                      delay: 0.3,
                      duration: 0.4,
                      ease: "easeOut",
                    },
                  }}
                >
                  {children}
                </motion.div>
              ) : null}
            </FamilyButtonContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// A container that wraps content and handles animations
interface FamilyButtonContainerProps {
  isExpanded: boolean
  toggleExpand: () => void
  children: ReactNode
  etiqueta: string
}

const FamilyButtonContainer: FC<FamilyButtonContainerProps> = ({
  isExpanded,
  toggleExpand,
  children,
  etiqueta,
}) => {
  return (
    <motion.div
      className={cn(
        "relative z-10 flex cursor-pointer flex-col items-center space-y-1 border border-white/10 text-white shadow-lg",
        !isExpanded
          ? "bg-gradient-to-b from-caja to-caja-header"
          : "bg-gradient-to-b from-caja-header to-caja-noche"
      )}
      layoutRoot
      layout
      initial={{ borderRadius: 21, width: "4rem", height: "4rem" }}
      animate={
        isExpanded
          ? {
              borderRadius: 20,
              width: CONTAINER_SIZE,
              height: CONTAINER_SIZE + 50,

              transition: {
                type: "spring",
                damping: 25,
                stiffness: 400,
                when: "beforeChildren",
              },
            }
          : {
              borderRadius: 21,
              width: "4rem",
              height: "4rem",
            }
      }
    >
      {children}

      <motion.div
        className="absolute"
        initial={{ x: "-50%" }}
        animate={{
          x: isExpanded ? "0%" : "-50%",
          transition: {
            type: "tween",
            ease: "easeOut",
            duration: 0.3,
          },
        }}
        style={{
          left: isExpanded ? "" : "50%",
          bottom: 6,
        }}
      >
        {isExpanded ? (
          <motion.div
            className="group rounded-full border border-white/30 bg-white/15 p-[10px] text-white shadow-2xl transition-colors duration-300 hover:border-white"
            onClick={toggleExpand}
            role="button"
            aria-label="Cerrar"
            layoutId="expand-toggle"
            initial={false}
            animate={{
              rotate: -360,
              transition: {
                duration: 0.4,
              },
            }}
          >
            <XIcon
              className={cn(
                "h-7 w-7 text-white/80 transition-colors duration-200 group-hover:text-white"
              )}
            />
          </motion.div>
        ) : (
          <motion.div
            className={cn(
              "group border border-white/20 bg-caja-acento p-[10px] shadow-2xl transition-colors duration-200"
            )}
            role="button"
            aria-label={etiqueta}
            style={{ borderRadius: 24 }}
            onClick={toggleExpand}
            layoutId="expand-toggle"
            initial={{ rotate: 180 }}
            animate={{
              rotate: -180,
              transition: {
                duration: 0.4,
              },
            }}
          >
            <PlusIcon className="h-7 w-7 text-caja-texto" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

export { FamilyButton }
export default FamilyButton
