import React, { useState, useEffect, useCallback } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

interface CarouselItem {
  title: string;
  titleEn: string;
  titleZhTw: string;
  permalink: string;
  image: string;
}

interface Props {
  items: CarouselItem[];
}

function getPostTitle(
  post: CarouselItem,
  currentLocale: string
): string {
  const localeMap: Record<string, keyof CarouselItem> = {
    en: 'titleEn',
    'zh-TW': 'titleZhTw',
  };
  const key = localeMap[currentLocale] ?? 'title';
  return post[key] as string;
}

const Carousel: React.FC<Props> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { i18n } = useDocusaurusContext();

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  }, [items.length]);

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  if (!items || items.length === 0) return null;

  return (
    <div className={styles.carouselContainer}>
      <div 
        className={styles.carouselInner} 
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {items.map((item, index) => (
          <div key={index} className={styles.carouselItem}>
            <Link to={item.permalink} className={styles.carouselLink}>
              <div className={styles.imageWrapper}>
                <img src={item.image} alt={item.title} className={styles.carouselImage} />
                <div className={styles.caption}>
                  <h3 className={styles.carouselTitle}>
                    {getPostTitle(item, i18n.currentLocale)}
                  </h3>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      <button className={`${styles.navButton} ${styles.prev}`} onClick={prevSlide}>
        &#10094;
      </button>
      <button className={`${styles.navButton} ${styles.next}`} onClick={nextSlide}>
        &#10095;
      </button>
      <div className={styles.indicators}>
        {items.map((_, index) => (
          <button
            key={index}
            className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
