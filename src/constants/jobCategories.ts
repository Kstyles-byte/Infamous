export interface JobCategory {
  id: string;
  name: string;
  icon: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
  { id: 'plumbing', name: 'Plumbing', icon: 'water-pump' },
  { id: 'electrical', name: 'Electrical', icon: 'flash' },
  { id: 'carpentry', name: 'Carpentry', icon: 'hammer' },
  { id: 'painting', name: 'Painting', icon: 'brush' },
  { id: 'cleaning', name: 'Cleaning', icon: 'broom' },
  { id: 'gardening', name: 'Gardening', icon: 'tree' },
  { id: 'appliance', name: 'Appliance Repair', icon: 'washing-machine' },
  { id: 'moving', name: 'Moving', icon: 'truck' },
  { id: 'carpet', name: 'Carpet Cleaning', icon: 'rug' },
  { id: 'pest', name: 'Pest Control', icon: 'bug' },
  { id: 'locksmith', name: 'Locksmith', icon: 'key' },
  { id: 'roofing', name: 'Roofing', icon: 'home-roof' },
  { id: 'hvac', name: 'HVAC', icon: 'fan' },
  { id: 'window', name: 'Window Repair', icon: 'window-open' },
  { id: 'fence', name: 'Fence Installation', icon: 'fence' },
  { id: 'drywall', name: 'Drywall', icon: 'wall' },
  { id: 'concrete', name: 'Concrete Work', icon: 'cement-mixer' },
  { id: 'insulation', name: 'Insulation', icon: 'home-heart' },
  { id: 'gutter', name: 'Gutter Cleaning', icon: 'water' },
  { id: 'other', name: 'Other', icon: 'tools' },
];

// Helper function to get all categories
export const getAllJobCategories = () => {
  return JOB_CATEGORIES.map(category => category.name);
};

// Helper function to get category by id
export const getCategoryById = (categoryId: string) => {
  return JOB_CATEGORIES.find(cat => cat.id === categoryId);
}; 