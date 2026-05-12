export interface HomeSectionBaseProps {
  enabled: boolean;
  order: number;
}

export type HomeSectionStyles = Record<string, string>;
export type HomeSectionCopy = Record<string, string>;

export interface HomeSectionWithStyleCopy extends HomeSectionBaseProps {
  sectionStyles: HomeSectionStyles;
  sectionCopy: HomeSectionCopy;
}
