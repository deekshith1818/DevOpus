"use client";
import React from "react";
import {
    motion,
    useScroll,
    useTransform,
    useSpring,
    MotionValue,
} from "framer-motion";

export const HeroParallax = ({
    products,
}: {
    products: {
        title: string;
        link: string;
        thumbnail: string;
    }[];
}) => {
    const firstRow = products.slice(0, 5);
    const secondRow = products.slice(5, 10);
    const thirdRow = products.slice(10, 15);
    const ref = React.useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

    const translateX = useSpring(
        useTransform(scrollYProgress, [0, 1], [0, 1000]),
        springConfig
    );
    const translateXReverse = useSpring(
        useTransform(scrollYProgress, [0, 1], [0, -1000]),
        springConfig
    );

    return (
        <div
            ref={ref}
            className="min-h-[100vh] md:min-h-[200vh] py-10 md:py-20 overflow-hidden antialiased relative flex flex-col self-auto"
        >
            <Header />
            <div className="mt-20">
                <motion.div className="flex flex-row-reverse space-x-reverse space-x-8 md:space-x-20 mb-10 md:mb-20">
                    {firstRow.map((product, i) => (
                        <ProductCard
                            product={product}
                            translate={translateX}
                            key={`row1-${i}`}
                        />
                    ))}
                </motion.div>
                <motion.div className="flex flex-row space-x-8 md:space-x-20 mb-10 md:mb-20">
                    {secondRow.map((product, i) => (
                        <ProductCard
                            product={product}
                            translate={translateXReverse}
                            key={`row2-${i}`}
                        />
                    ))}
                </motion.div>
                <motion.div className="flex flex-row-reverse space-x-reverse space-x-8 md:space-x-20">
                    {thirdRow.map((product, i) => (
                        <ProductCard
                            product={product}
                            translate={translateX}
                            key={`row3-${i}`}
                        />
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export const Header = () => {
    return (
        <div className="max-w-7xl relative mx-auto py-20 md:py-24 px-4 w-full left-0 top-0">
            <h1 className="text-3xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500 tracking-tight">
                Beautiful UIs. <br /> Generated in seconds.
            </h1>
            <p className="max-w-2xl text-lg md:text-xl mt-8 text-zinc-400 font-light leading-relaxed">
                Explore stunning, production-ready applications built entirely by the
                DevOpus 4-Agent pipeline. No templates. Just pure AI architecture.
            </p>
        </div>
    );
};

export const ProductCard = ({
    product,
    translate,
}: {
    product: {
        title: string;
        link: string;
        thumbnail: string;
    };
    translate: MotionValue<number>;
}) => {
    return (
        <motion.div
            style={{
                x: translate,
            }}
            whileHover={{
                y: -20,
            }}
            key={product.title}
            className="group/product h-[12rem] w-[20rem] sm:h-[15rem] sm:w-[28rem] md:h-[22rem] md:w-[40rem] relative flex-shrink-0"
        >
            <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group-hover/product:shadow-2xl"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={product.thumbnail}
                    className="object-cover object-center absolute h-full w-full inset-0 rounded-xl"
                    alt={product.title}
                />
            </a>
            <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-80 bg-black rounded-xl pointer-events-none transition-opacity duration-300" />
            <h2 className="absolute bottom-4 left-4 opacity-0 group-hover/product:opacity-100 text-white font-semibold transition-opacity duration-300">
                {product.title}
            </h2>
        </motion.div>
    );
};
