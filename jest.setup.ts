import '@testing-library/jest-dom'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const React = require('react')
    const {
      blurDataURL,
      fill,
      loader,
      placeholder,
      priority,
      quality,
      sizes,
      unoptimized,
      ...imgProps
    } = props

    return React.createElement('img', imgProps)
  },
}))

jest.mock('framer-motion', () => {
  const React = require('react')

  const MOTION_PROPS = new Set([
    'animate',
    'drag',
    'dragConstraints',
    'dragElastic',
    'dragMomentum',
    'dragTransition',
    'exit',
    'initial',
    'layout',
    'layoutId',
    'transition',
    'variants',
    'viewport',
    'whileFocus',
    'whileHover',
    'whileInView',
    'whileTap',
  ])

  const stripMotionProps = (props: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(props).filter(([key]) => !MOTION_PROPS.has(key)))

  const motion = new Proxy(
    {},
    {
      get: (_target, tagName: string) =>
        React.forwardRef(
          ({ children, ...props }: { children?: React.ReactNode }, ref: React.Ref<HTMLElement>) =>
            React.createElement(tagName, { ref, ...stripMotionProps(props) }, children)
        ),
    }
  )

  return {
    __esModule: true,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion,
    useReducedMotion: () => false,
  }
})
