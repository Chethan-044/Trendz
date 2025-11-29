import React from 'react'
import { assets } from '../assets/assets'

const Hero = () => {
  return (
    <div className='flex   flex-col sm:flex-row border rounded-3xl  bg-[#141819] border-gray-400'>
      {/* Hero Left Side */}
      <div className='w-full sm:w-1/2 flex items-center justify-center py-10 sm:py-0'>
            <div className='text-[#C3BBB2]'>
                <div className='flex items-center gap-2'>
                    <p className=' font-medium text-sm md:text-base'>Everyday Essentials Here</p>
                </div>
                <h1 className='prata-regular text-3xl sm:py-3 lg:text-5xl leading-relaxed'>Premium Value</h1>
                <div className='flex items-center gap-2'>
                    <p className='font-semibold text-sm md:text-base'>SHOP NOW</p>
                    <p className='w-8 md:w-11 h-[1px] bg-[#C3BBB2]'></p>
                </div>
            </div>
      </div>
      {/* Hero Right Side */}
      <img className='h-full origin-bottom rounded-bl-3xl rounded-br-3xl  sm:w-1/2' src={assets.heroimage} alt="" />
    </div>
  )
}

export default Hero
