import { LEGAL_INFO } from "./config";

function whoWeAreParenthetical(locale: "en" | "bn"): string {
  const bits: string[] = [];
  if (LEGAL_INFO.registeredBusinessName) {
    bits.push(locale === "bn" ? `নিবন্ধিত ব্যবসার নাম: ${LEGAL_INFO.registeredBusinessName}` : `registered business name: ${LEGAL_INFO.registeredBusinessName}`);
  }
  if (LEGAL_INFO.tradeLicenceNumber) {
    bits.push(locale === "bn" ? `ট্রেড লাইসেন্স নম্বর: ${LEGAL_INFO.tradeLicenceNumber}` : `trade licence number: ${LEGAL_INFO.tradeLicenceNumber}`);
  }
  return bits.length > 0 ? ` (${bits.join("; ")})` : "";
}

export function TermsEn({ showAdminBanner }: { showAdminBanner: boolean }) {
  const whoWeAre = whoWeAreParenthetical("en");
  return (
    <>
      {showAdminBanner && (
        <p className="rounded-control bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Template — not legal advice.</strong> This document was drafted to match Pick Up&apos;s actual
          features (marketplace structure, age-restricted products, scheduled orders, payments, refunds) so it&apos;s
          ready for a lawyer to review, not so it can be treated as final. Have a qualified lawyer licensed in
          Bangladesh review and adapt it — including consumer-protection, e-commerce, and tobacco-control requirements
          — before Pick Up launches to real customers. (Only visible to admins.)
        </p>
      )}
      {LEGAL_INFO.lastUpdated && (
        <p className="text-xs text-gray-500">Last updated: {LEGAL_INFO.lastUpdated} · Effective for users in Khagrachari Sadar, Bangladesh.</p>
      )}

      <h2 className="font-heading text-brand-dark">1. Who we are</h2>
      <p>
        Pick Up is an online marketplace operated by Pick Up{whoWeAre}, based in Khagrachari Sadar, Khagrachari,
        Chattogram, Bangladesh. You can reach us at{" "}
        <a href="mailto:information@pickupn.com">information@pickupn.com</a> or{" "}
        <a href="tel:+8801310790678">+8801310790678</a>.
      </p>

      <h2 className="font-heading text-brand-dark">2. Acceptance of these terms</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Pick Up website, mobile
        experience, and related services (together, the &quot;Platform&quot;), operated by Pick Up (&quot;Pick
        Up,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, browsing the Platform,
        or placing an order, you agree to be bound by these Terms and our <a href="/legal/privacy">Privacy Policy</a>
        . If you do not agree, do not use the Platform.
      </p>
      <p>
        If you are using the Platform on behalf of a business (for example, as a Vendor or Advertiser), you confirm
        you have authority to bind that business to these Terms, and &quot;you&quot; refers to that business as well
        as you personally.
      </p>

      <h2 className="font-heading text-brand-dark">3. Definitions</h2>
      <ul>
        <li><strong>Customer</strong> — a person who browses or orders products or food through the Platform.</li>
        <li><strong>Vendor</strong> — an independent grocery/essentials shop or restaurant that lists products or menu items for sale through the Platform.</li>
        <li><strong>Rider</strong> — an independent delivery partner who accepts and fulfills deliveries through the Platform.</li>
        <li><strong>Advertiser</strong> — a business that purchases advertising placements shown to Customers on the Platform.</li>
        <li><strong>Order</strong> — a purchase placed by a Customer, which may be split into one Order per Vendor when a cart contains items from multiple Vendors.</li>
        <li><strong>Content</strong> — product listings, images, descriptions, reviews, and other material submitted to the Platform by Vendors, Riders, Customers, or Advertisers.</li>
      </ul>

      <h2 className="font-heading text-brand-dark">4. The Pick Up marketplace</h2>
      <p>
        Pick Up is a marketplace that connects Customers with independent Vendors and Riders. Except where we
        expressly say otherwise, Pick Up is not the seller of the products or food listed on the Platform, does not
        prepare or manufacture Vendor products, and is not a party to the contract of sale between a Customer and a
        Vendor. Vendors are solely responsible for the accuracy of their listings and the quality, safety, legality,
        and fitness of the products they sell. Riders are independent contractors responsible for safe and lawful
        conduct of deliveries.
      </p>
      <p>
        Pick Up facilitates discovery, ordering, payment collection, and delivery logistics, and may set rules
        (including commission rates, service areas, and content standards) that Vendors and Riders must follow to use
        the Platform.
      </p>

      <h2 className="font-heading text-brand-dark">5. Eligibility and accounts</h2>
      <p>
        You must be at least 18 years old to create an account. You must provide accurate, current information when
        registering and keep it up to date, and you are responsible for all activity under your account and for
        keeping your password confidential. Notify us immediately of any unauthorized use of your account.
      </p>
      <p>
        We may suspend or terminate an account that provides false information, violates these Terms, or is used for
        fraudulent, abusive, or unlawful activity. Where practical, we will tell you why an account was suspended or
        terminated and how to appeal.
      </p>

      <h2 className="font-heading text-brand-dark">6. Products, pricing, and availability</h2>
      <p>
        Prices are shown in Bangladeshi Taka (Tk) and are set by each Vendor, plus any delivery fee, applicable tax,
        and platform charges disclosed at checkout. Vendors are responsible for keeping stock levels, availability,
        and product descriptions accurate; Pick Up does not guarantee that a listed product is in stock or that
        photos exactly match what is delivered. We and Vendors may correct pricing or listing errors, including
        after an order is placed, and will notify you if this affects your order.
      </p>

      <h2 className="font-heading text-brand-dark">7. Placing and accepting an order</h2>
      <p>
        Placing an order is an offer to purchase, which the Vendor may accept or decline (for example, if an item is
        unexpectedly out of stock or the Vendor is temporarily too busy to fulfil it on time). A contract of sale
        forms only once the Vendor accepts the order. If a Vendor cannot accept your order, you will be notified and
        any payment already taken for that order will be refunded.
      </p>
      <p>
        A restaurant may ask you to wait briefly for confirmation during high demand rather than declining the order
        outright; in that case your order remains pending until the restaurant confirms or is unable to proceed, and
        you will be shown an estimated wait.
      </p>

      <h2 className="font-heading text-brand-dark">8. Scheduled and weekly grocery orders</h2>
      <p>
        Some grocery items are fulfilled in batches rather than on demand and are clearly marked as such. Orders
        containing these items must be scheduled at least 24 hours in advance instead of our usual fast delivery, and
        the earliest available delivery slot will be enforced at checkout. Restaurant orders may separately offer a
        &quot;schedule for later&quot; option where supported by the restaurant.
      </p>

      <h2 className="font-heading text-brand-dark">9. Delivery and delivery fees</h2>
      <p>
        Delivery fees are shown at checkout before you pay and depend on your delivery area. Estimated delivery
        times are best-effort estimates, not guarantees, and may vary due to weather, traffic, order volume, rider
        availability, or circumstances beyond our control. Delivery is available only within active delivery zones;
        addresses outside current coverage cannot be served, and you may request coverage be extended to your area
        through the Platform. You are responsible for providing an accurate delivery address and being reasonably
        available to receive the order.
      </p>
      <p>
        From time to time we may run free-delivery offers (for example, on your first order, above a minimum order
        value, or for a limited time). Free-delivery offers are shown at checkout when they apply, have no cash
        value, may be withdrawn or changed at any time before an order is placed, and do not apply to age-restricted
        items even if the rest of the order qualifies.
      </p>

      <h2 className="font-heading text-brand-dark">10. Age-restricted products</h2>
      <p>
        Certain products (such as cigarettes and smoking accessories) are only shown and sold to Customers when this
        is specifically enabled by Pick Up, and only in plain, standardized packaging with the pack size and a
        health warning shown — never a Vendor-supplied photo. To order an age-restricted product, you must confirm
        at checkout that you meet the applicable minimum age (18, unless a higher age applies by law); our rider may
        ask to see a valid form of ID at the door and may decline to hand over the item, or the item may be removed
        from your order, if your age cannot be reasonably verified. Age-restricted items are never discounted,
        bundled into promotions, or counted toward free-delivery offers, and are not shown on the homepage, in deals,
        in search suggestions, or in advertising. Pick Up may refuse, cancel, or reverse such orders at its
        discretion to comply with the law, and reserves the right to report suspected underage purchase attempts as
        required by law. Electronic cigarettes, vapes, heated-tobacco products, and nicotine pouches are never sold
        on the Platform.
      </p>

      <h2 className="font-heading text-brand-dark">11. Payments</h2>
      <p>
        You may pay by cash on delivery or through a supported digital payment method shown at checkout. By
        submitting payment details you confirm you are authorized to use that payment method. Digital payments are
        processed by third-party payment providers under their own terms; Pick Up does not store your full payment
        card or mobile-wallet credentials. All charges are due at the time of order unless cash on delivery is
        selected.
      </p>

      <h2 className="font-heading text-brand-dark">12. Coupons and promotions</h2>
      <p>
        Coupons, discounts, and promotional offers are subject to the specific terms shown at the time of the offer
        (for example, minimum order value, eligible items, or a redemption limit), may be withdrawn or modified at
        any time before use, and have no cash value. Coupons never apply to age-restricted items, even when the rest
        of the order qualifies. We may deny or reverse a discount obtained through error, abuse, or violation of
        these Terms.
      </p>

      <h2 className="font-heading text-brand-dark">13. Cancellations, refunds, and returns</h2>
      <p>
        You may cancel an order free of charge before the Vendor begins preparing it; once preparation has started,
        cancellation may not be possible or may be subject to a charge for work or ingredients already committed. If
        an item is missing, incorrect, damaged, or not as described, contact support within a reasonable time of
        delivery. Refund requests are reviewed case by case; approved refunds are processed back to your original
        payment method, or, for cash-on-delivery orders, by a method our support team agrees with you. Age-restricted
        items may not be returned once delivered, except where the item itself is faulty or was not what you
        ordered.
      </p>

      <h2 className="font-heading text-brand-dark">14. Reviews and content you submit</h2>
      <p>
        You may only submit reviews for orders you actually placed, and reviews must be honest, non-defamatory, and
        free of unlawful, abusive, or misleading content. By submitting a review, photo, or other content to the
        Platform, you grant Pick Up a non-exclusive, royalty-free, worldwide licence to display, reproduce, and use
        it in connection with operating and promoting the Platform. We may remove content that violates these Terms
        or applicable law.
      </p>

      <h2 className="font-heading text-brand-dark">15. Vendor and restaurant terms</h2>
      <p>
        Vendors sell on the Platform under a separate vendor agreement that governs onboarding approval, the
        commission rate charged on each order (which is set per Vendor and shown to the Vendor in their dashboard),
        payout schedules and payout requests, product-listing standards, order-acceptance obligations, and grounds
        for suspension. Vendors are independently responsible for food-safety, licensing, tax, and consumer-law
        compliance for everything they sell, and for uploading only accurate business documents (such as trade
        licence and ownership identification) when applying to sell on the Platform.
      </p>

      <h2 className="font-heading text-brand-dark">16. Rider terms</h2>
      <p>
        Riders are independent contractors, not employees or agents of Pick Up, and earn a commission on the
        delivery fee for each delivery they complete, at a rate shown to them in their dashboard. Riders are
        responsible for performing deliveries safely and lawfully, verifying age where an order contains an
        age-restricted item, and conducting themselves appropriately with Customers and Vendors, in accordance with
        any rider agreement.
      </p>

      <h2 className="font-heading text-brand-dark">17. Advertising on the Platform</h2>
      <p>
        Businesses may purchase advertising placements (such as homepage banners or sponsored listings) shown to
        Customers, subject to our review and approval of the advertising request and content before it is scheduled
        or billed. Advertised content is provided by the advertiser, marked as &quot;Sponsored&quot; or
        &quot;Advertisement,&quot; and Pick Up does not endorse advertised products or claims. We do not accept
        advertising that promotes age-restricted products (such as cigarettes and smoking accessories) or any
        prohibited item listed below. Advertising is governed by a separate advertiser agreement covering approval,
        pricing, and content standards.
      </p>

      <h2 className="font-heading text-brand-dark">18. Prohibited items</h2>
      <p>You may not list, advertise, or attempt to order through the Platform:</p>
      <ul>
        <li>electronic cigarettes, vapes, heated-tobacco products, nicotine pouches, or nicotine salts;</li>
        <li>illegal drugs, controlled substances, or drug paraphernalia;</li>
        <li>firearms, ammunition, explosives, or weapons;</li>
        <li>counterfeit or stolen goods;</li>
        <li>any product that is illegal to sell, possess, or deliver in Bangladesh, or that is age-restricted and sold outside the controls described in Section 10.</li>
      </ul>
      <p>We may remove a listing, cancel an order, and suspend the responsible account where this Section is violated.</p>

      <h2 className="font-heading text-brand-dark">19. Other prohibited conduct</h2>
      <p>You also agree not to:</p>
      <ul>
        <li>use the Platform for any unlawful purpose or in violation of these Terms;</li>
        <li>attempt to circumvent age-verification or delivery-zone controls;</li>
        <li>submit false, misleading, or fraudulent information, orders, reviews, or payment details;</li>
        <li>interfere with the security or normal operation of the Platform, including by scraping, reverse-engineering, or introducing malicious code;</li>
        <li>harass, threaten, or abuse Vendors, Riders, or Pick Up staff.</li>
      </ul>

      <h2 className="font-heading text-brand-dark">20. Intellectual property</h2>
      <p>
        The Pick Up name, logo, and Platform design are owned by Pick Up and may not be used without our written
        permission. Vendor and Advertiser content remains owned by the party that submitted it, subject to the
        licence granted to Pick Up to display and operate it on the Platform.
      </p>

      <h2 className="font-heading text-brand-dark">21. Disclaimers and limitation of liability</h2>
      <p>
        The Platform is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted by
        law, Pick Up disclaims all warranties regarding the Platform and the products or services offered through
        it, and is not liable for indirect, incidental, or consequential loss arising from your use of the Platform,
        delays or failures in delivery, or the acts or omissions of independent Vendors or Riders. Nothing in these
        Terms limits liability that cannot be limited under applicable law, including for death, personal injury, or
        fraud.
      </p>

      <h2 className="font-heading text-brand-dark">22. Indemnification</h2>
      <p>
        You agree to indemnify and hold Pick Up harmless from claims, losses, and expenses (including reasonable
        legal fees) arising from your breach of these Terms, misuse of the Platform, or violation of applicable law.
      </p>

      <h2 className="font-heading text-brand-dark">23. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of Bangladesh. Any dispute arising from these Terms or your use of the
        Platform will first be addressed through Pick Up customer support; if unresolved, disputes are subject to
        the exclusive jurisdiction of the courts of Bangladesh, without prejudice to any right you have under
        mandatory consumer-protection law.
      </p>

      <h2 className="font-heading text-brand-dark">24. Changes to these terms</h2>
      <p>
        We may update these Terms from time to time to reflect changes to the Platform or applicable law. We will
        post the updated Terms with a new &quot;last updated&quot; date, and material changes will be highlighted on
        the Platform. Continued use of Pick Up after changes take effect means you accept the updated Terms.
      </p>

      <h2 className="font-heading text-brand-dark">25. Contact us</h2>
      <p>
        Questions about these Terms can be sent through the Support page, by email to{" "}
        <a href="mailto:information@pickupn.com">information@pickupn.com</a>, or by phone at{" "}
        <a href="tel:+8801310790678">+8801310790678</a>.
      </p>
    </>
  );
}

export function TermsBn({ showAdminBanner }: { showAdminBanner: boolean }) {
  const whoWeAre = whoWeAreParenthetical("bn");
  return (
    <>
      {showAdminBanner && (
        <p className="rounded-control bg-amber-50 p-3 text-xs text-amber-900">
          <strong>টেমপ্লেট — এটি আইনি পরামর্শ নয়।</strong> Pick Up-এর বাস্তব ফিচারগুলোর (মার্কেটপ্লেস কাঠামো,
          বয়স-নিষিদ্ধ পণ্য, শিডিউল করা অর্ডার, পেমেন্ট, রিফান্ড) সাথে মিলিয়ে এই নথিটি তৈরি করা হয়েছে, যাতে একজন
          আইনজীবী এটি পর্যালোচনা করতে পারেন — এটিকে চূড়ান্ত হিসেবে গণ্য করা উচিত নয়। Pick Up সাধারণ গ্রাহকদের জন্য চালু
          করার আগে বাংলাদেশে লাইসেন্সপ্রাপ্ত একজন যোগ্য আইনজীবীকে দিয়ে এটি পর্যালোচনা ও সংশোধন করান — ভোক্তা-সুরক্ষা,
          ই-কমার্স এবং তামাক-নিয়ন্ত্রণ সংক্রান্ত আইনসহ। (শুধুমাত্র অ্যাডমিনদের জন্য দৃশ্যমান।)
        </p>
      )}
      {LEGAL_INFO.lastUpdated && (
        <p className="text-xs text-gray-500">সর্বশেষ হালনাগাদ: {LEGAL_INFO.lastUpdated} · খাগড়াছড়ি সদর, বাংলাদেশের ব্যবহারকারীদের জন্য প্রযোজ্য।</p>
      )}

      <h2 className="font-heading text-brand-dark">১. আমরা কারা</h2>
      <p>
        Pick Up একটি অনলাইন মার্কেটপ্লেস, যা পরিচালনা করে Pick Up{whoWeAre}, ঠিকানা: খাগড়াছড়ি সদর, খাগড়াছড়ি,
        চট্টগ্রাম, বাংলাদেশ। যোগাযোগ করতে পারেন{" "}
        <a href="mailto:information@pickupn.com">information@pickupn.com</a> অথবা{" "}
        <a href="tel:+8801310790678">+8801310790678</a> নম্বরে।
      </p>

      <h2 className="font-heading text-brand-dark">২. শর্তাবলী মেনে নেওয়া</h2>
      <p>
        এই সেবার শর্তাবলী (&quot;শর্তাবলী&quot;) Pick Up ওয়েবসাইট, মোবাইল অভিজ্ঞতা এবং সংশ্লিষ্ট সেবাসমূহ
        (একত্রে &quot;প্ল্যাটফর্ম&quot;) ব্যবহারের ক্ষেত্রে প্রযোজ্য, যা পরিচালনা করে Pick Up (&quot;আমরা&quot; বা
        &quot;আমাদের&quot;)। অ্যাকাউন্ট তৈরি করে, প্ল্যাটফর্ম ব্রাউজ করে, বা অর্ডার দিয়ে আপনি এই শর্তাবলী এবং আমাদের{" "}
        <a href="/legal/privacy">গোপনীয়তা নীতি</a>-তে সম্মত হচ্ছেন। আপনি সম্মত না হলে প্ল্যাটফর্ম ব্যবহার করবেন না।
      </p>
      <p>
        আপনি যদি কোনো ব্যবসার পক্ষে (যেমন ভেন্ডর বা বিজ্ঞাপনদাতা হিসেবে) প্ল্যাটফর্ম ব্যবহার করেন, তাহলে আপনি
        নিশ্চিত করছেন যে সেই ব্যবসাকে এই শর্তাবলীতে আবদ্ধ করার অধিকার আপনার আছে, এবং &quot;আপনি&quot; বলতে আপনার
        পাশাপাশি সেই ব্যবসাকেও বোঝানো হচ্ছে।
      </p>

      <h2 className="font-heading text-brand-dark">৩. সংজ্ঞা</h2>
      <ul>
        <li><strong>গ্রাহক</strong> — যিনি প্ল্যাটফর্মের মাধ্যমে পণ্য বা খাবার ব্রাউজ বা অর্ডার করেন।</li>
        <li><strong>ভেন্ডর</strong> — একটি স্বতন্ত্র মুদি/নিত্যপ্রয়োজনীয় পণ্যের দোকান বা রেস্টুরেন্ট, যারা প্ল্যাটফর্মে পণ্য বা মেনু আইটেম তালিকাভুক্ত করে।</li>
        <li><strong>রাইডার</strong> — একজন স্বতন্ত্র ডেলিভারি পার্টনার, যিনি প্ল্যাটফর্মের মাধ্যমে ডেলিভারি গ্রহণ ও সম্পন্ন করেন।</li>
        <li><strong>বিজ্ঞাপনদাতা</strong> — একটি ব্যবসা যা গ্রাহকদের দেখানোর জন্য প্ল্যাটফর্মে বিজ্ঞাপন প্লেসমেন্ট কেনে।</li>
        <li><strong>অর্ডার</strong> — গ্রাহকের দেওয়া একটি ক্রয়, যা একাধিক ভেন্ডরের পণ্য থাকলে প্রতি ভেন্ডরের জন্য আলাদা অর্ডারে ভাগ হতে পারে।</li>
        <li><strong>কনটেন্ট</strong> — পণ্যের তালিকা, ছবি, বর্ণনা, রিভিউ এবং ভেন্ডর, রাইডার, গ্রাহক বা বিজ্ঞাপনদাতাদের জমা দেওয়া অন্যান্য উপকরণ।</li>
      </ul>

      <h2 className="font-heading text-brand-dark">৪. Pick Up মার্কেটপ্লেস</h2>
      <p>
        Pick Up একটি মার্কেটপ্লেস যা গ্রাহকদের স্বতন্ত্র ভেন্ডর ও রাইডারদের সাথে সংযুক্ত করে। স্পষ্টভাবে অন্যথা না
        বলা পর্যন্ত, Pick Up প্ল্যাটফর্মে তালিকাভুক্ত পণ্য বা খাবারের বিক্রেতা নয়, ভেন্ডরের পণ্য প্রস্তুত বা উৎপাদন
        করে না, এবং গ্রাহক ও ভেন্ডরের মধ্যে ক্রয়-চুক্তির পক্ষ নয়। তালিকার নির্ভুলতা এবং বিক্রিত পণ্যের মান,
        নিরাপত্তা, বৈধতা ও উপযুক্ততার জন্য ভেন্ডর সম্পূর্ণভাবে দায়ী। রাইডাররা স্বতন্ত্র ঠিকাদার, যারা নিরাপদ ও বৈধ
        উপায়ে ডেলিভারি সম্পন্ন করার জন্য দায়ী।
      </p>
      <p>
        Pick Up পণ্য খুঁজে পাওয়া, অর্ডার করা, পেমেন্ট সংগ্রহ এবং ডেলিভারি লজিস্টিক্স সহজ করে, এবং প্ল্যাটফর্ম
        ব্যবহারের জন্য ভেন্ডর ও রাইডারদের মেনে চলার জন্য নিয়ম (কমিশন হার, সেবা এলাকা, কনটেন্ট মানদণ্ডসহ) নির্ধারণ
        করতে পারে।
      </p>

      <h2 className="font-heading text-brand-dark">৫. যোগ্যতা ও অ্যাকাউন্ট</h2>
      <p>
        অ্যাকাউন্ট তৈরি করতে আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে। নিবন্ধনের সময় সঠিক ও হালনাগাদ তথ্য দিতে হবে এবং তা
        হালনাগাদ রাখতে হবে। আপনার অ্যাকাউন্টের অধীনে সকল কার্যকলাপ এবং পাসওয়ার্ডের গোপনীয়তা রক্ষার দায়িত্ব আপনার।
        অননুমোদিত ব্যবহার লক্ষ্য করলে আমাদের অবিলম্বে জানান।
      </p>
      <p>
        মিথ্যা তথ্য প্রদান করা, এই শর্তাবলী লঙ্ঘন করা, বা প্রতারণামূলক/অবৈধ কাজে ব্যবহৃত হওয়া অ্যাকাউন্ট আমরা স্থগিত
        বা বাতিল করতে পারি। যেখানে সম্ভব, কেন অ্যাকাউন্ট স্থগিত/বাতিল হয়েছে এবং কীভাবে আপিল করা যায় তা আমরা জানাব।
      </p>

      <h2 className="font-heading text-brand-dark">৬. পণ্য, মূল্য এবং প্রাপ্যতা</h2>
      <p>
        মূল্য বাংলাদেশি টাকায় (Tk) দেখানো হয় এবং প্রতিটি ভেন্ডর নির্ধারণ করে, এর সাথে চেকআউটে প্রদর্শিত ডেলিভারি
        ফি, প্রযোজ্য কর এবং প্ল্যাটফর্ম চার্জ যুক্ত হয়। স্টকের পরিমাণ, প্রাপ্যতা এবং পণ্যের বর্ণনা সঠিক রাখার
        দায়িত্ব ভেন্ডরের; Pick Up নিশ্চয়তা দেয় না যে তালিকাভুক্ত পণ্য স্টকে আছে বা ছবি হুবহু মিলবে। অর্ডার দেওয়ার
        পরেও আমরা ও ভেন্ডর মূল্য বা তালিকার ভুল সংশোধন করতে পারি, এবং তা আপনার অর্ডারে প্রভাব ফেললে আপনাকে জানানো
        হবে।
      </p>

      <h2 className="font-heading text-brand-dark">৭. অর্ডার দেওয়া ও গ্রহণ করা</h2>
      <p>
        অর্ডার দেওয়া একটি ক্রয়-প্রস্তাব, যা ভেন্ডর গ্রহণ বা প্রত্যাখ্যান করতে পারে (যেমন কোনো পণ্য হঠাৎ স্টকে না
        থাকলে বা ভেন্ডর সাময়িকভাবে অর্ডার পূরণে অক্ষম হলে)। ভেন্ডর অর্ডার গ্রহণ করলেই কেবল ক্রয়-চুক্তি কার্যকর হয়।
        ভেন্ডর অর্ডার গ্রহণ করতে না পারলে আপনাকে জানানো হবে এবং ইতিমধ্যে নেওয়া পেমেন্ট ফেরত দেওয়া হবে।
      </p>
      <p>
        উচ্চ চাহিদার সময় কোনো রেস্টুরেন্ট অর্ডার প্রত্যাখ্যান না করে নিশ্চিতকরণের জন্য সংক্ষিপ্ত অপেক্ষা চাইতে
        পারে; এক্ষেত্রে রেস্টুরেন্ট নিশ্চিত করা বা অক্ষম হওয়া পর্যন্ত আপনার অর্ডার মুলতবি থাকে, এবং আপনাকে একটি
        আনুমানিক অপেক্ষার সময় দেখানো হবে।
      </p>

      <h2 className="font-heading text-brand-dark">৮. শিডিউল করা ও সাপ্তাহিক মুদি অর্ডার</h2>
      <p>
        কিছু মুদি পণ্য তাৎক্ষণিক নয়, বরং ব্যাচ আকারে সরবরাহ করা হয় এবং স্পষ্টভাবে চিহ্নিত থাকে। এই পণ্যসহ অর্ডার
        আমাদের সাধারণ দ্রুত ডেলিভারির পরিবর্তে কমপক্ষে ২৪ ঘণ্টা আগে শিডিউল করতে হবে, এবং চেকআউটে সবচেয়ে আগের
        ডেলিভারি স্লট প্রয়োগ করা হবে। রেস্টুরেন্ট অর্ডারে আলাদাভাবে রেস্টুরেন্ট সমর্থন করলে &quot;পরে শিডিউল
        করুন&quot; অপশন থাকতে পারে।
      </p>

      <h2 className="font-heading text-brand-dark">৯. ডেলিভারি ও ডেলিভারি ফি</h2>
      <p>
        ডেলিভারি ফি পেমেন্টের আগে চেকআউটে দেখানো হয় এবং আপনার ডেলিভারি এলাকার উপর নির্ভর করে। আনুমানিক ডেলিভারি
        সময় একটি যথাসাধ্য প্রাক্কলন, নিশ্চয়তা নয়, এবং আবহাওয়া, ট্রাফিক, অর্ডারের পরিমাণ, রাইডারের প্রাপ্যতা বা
        আমাদের নিয়ন্ত্রণের বাইরের পরিস্থিতির কারণে পরিবর্তিত হতে পারে। শুধুমাত্র সক্রিয় ডেলিভারি এলাকার মধ্যে
        ডেলিভারি পাওয়া যায়; বর্তমান কভারেজের বাইরের ঠিকানায় ডেলিভারি দেওয়া যায় না, এবং আপনি প্ল্যাটফর্মের মাধ্যমে
        আপনার এলাকায় কভারেজ বাড়ানোর অনুরোধ করতে পারেন। সঠিক ডেলিভারি ঠিকানা দেওয়া এবং অর্ডার গ্রহণের জন্য যুক্তিসঙ্গতভাবে
        উপলব্ধ থাকার দায়িত্ব আপনার।
      </p>
      <p>
        মাঝে মাঝে আমরা ফ্রি-ডেলিভারি অফার চালু করতে পারি (যেমন আপনার প্রথম অর্ডারে, ন্যূনতম অর্ডার মূল্যের উপরে,
        অথবা সীমিত সময়ের জন্য)। ফ্রি-ডেলিভারি অফার প্রযোজ্য হলে চেকআউটে দেখানো হয়, এর কোনো নগদ মূল্য নেই, অর্ডার
        দেওয়ার আগে যেকোনো সময় প্রত্যাহার বা পরিবর্তন করা যেতে পারে, এবং বাকি অর্ডার যোগ্য হলেও বয়স-নিষিদ্ধ পণ্যের
        ক্ষেত্রে প্রযোজ্য নয়।
      </p>

      <h2 className="font-heading text-brand-dark">১০. বয়স-নিষিদ্ধ পণ্য</h2>
      <p>
        নির্দিষ্ট কিছু পণ্য (যেমন সিগারেট ও ধূমপান সামগ্রী) শুধুমাত্র Pick Up সুনির্দিষ্টভাবে চালু করলেই গ্রাহকদের
        দেখানো ও বিক্রি করা হয়, এবং শুধুমাত্র সাধারণ, মানসম্মত প্যাকেজিংয়ে প্যাক সাইজ ও স্বাস্থ্য সতর্কতাসহ — কখনো
        ভেন্ডরের দেওয়া ছবি নয়। বয়স-নিষিদ্ধ পণ্য অর্ডার করতে চেকআউটে আপনাকে নিশ্চিত করতে হবে যে আপনি প্রযোজ্য
        ন্যূনতম বয়সের (সাধারণত ১৮, আইন অনুযায়ী বেশি হলে তাই প্রযোজ্য) অধিকারী; আমাদের রাইডার দরজায় বৈধ পরিচয়পত্র
        দেখতে চাইতে পারেন এবং যুক্তিসঙ্গতভাবে বয়স নিশ্চিত করা না গেলে পণ্য হস্তান্তর না করতে পারেন বা অর্ডার থেকে
        তা বাদ দিতে পারেন। বয়স-নিষিদ্ধ পণ্যে কখনো ছাড় প্রযোজ্য হয় না, কোনো প্রমোশনের সাথে বান্ডিল করা হয় না, এবং
        ফ্রি-ডেলিভারি অফারের জন্য গণনা করা হয় না, এবং হোমপেজ, ডিল, সার্চ সাজেশন বা বিজ্ঞাপনে দেখানো হয় না। আইন মেনে
        চলতে Pick Up নিজ বিবেচনায় এমন অর্ডার প্রত্যাখ্যান, বাতিল বা বিপরীত করতে পারে, এবং আইন অনুযায়ী প্রয়োজনে
        অপ্রাপ্তবয়স্কদের ক্রয়-প্রচেষ্টার বিষয়ে রিপোর্ট করার অধিকার রাখে। ই-সিগারেট, ভেইপ, হিটেড-টোব্যাকো পণ্য এবং
        নিকোটিন পাউচ প্ল্যাটফর্মে কখনো বিক্রি করা হয় না।
      </p>

      <h2 className="font-heading text-brand-dark">১১. পেমেন্ট</h2>
      <p>
        আপনি ক্যাশ অন ডেলিভারি অথবা চেকআউটে দেখানো সমর্থিত ডিজিটাল পেমেন্ট পদ্ধতিতে পেমেন্ট করতে পারেন। পেমেন্ট
        তথ্য জমা দিয়ে আপনি নিশ্চিত করছেন যে সেই পেমেন্ট পদ্ধতি ব্যবহারের অনুমতি আপনার আছে। ডিজিটাল পেমেন্ট তৃতীয়-পক্ষ
        পেমেন্ট প্রদানকারীদের নিজস্ব শর্তাবলীর অধীনে প্রক্রিয়া করা হয়; Pick Up আপনার সম্পূর্ণ কার্ড বা মোবাইল-ওয়ালেট
        তথ্য সংরক্ষণ করে না। ক্যাশ অন ডেলিভারি নির্বাচন না করলে অর্ডারের সময়েই সমস্ত চার্জ পরিশোধযোগ্য।
      </p>

      <h2 className="font-heading text-brand-dark">১২. কুপন ও প্রমোশন</h2>
      <p>
        কুপন, ছাড় এবং প্রমোশনাল অফার অফার প্রদানের সময় দেখানো নির্দিষ্ট শর্তাবলীর (যেমন ন্যূনতম অর্ডার মূল্য,
        যোগ্য পণ্য, বা ব্যবহারের সীমা) সাপেক্ষে, ব্যবহারের আগে যেকোনো সময় প্রত্যাহার বা পরিবর্তন করা যেতে পারে, এবং
        এর কোনো নগদ মূল্য নেই। বাকি অর্ডার যোগ্য হলেও কুপন কখনো বয়স-নিষিদ্ধ পণ্যে প্রযোজ্য হয় না। ভুল, অপব্যবহার বা
        এই শর্তাবলী লঙ্ঘনের মাধ্যমে পাওয়া ছাড় আমরা বাতিল বা প্রত্যাখ্যান করতে পারি।
      </p>

      <h2 className="font-heading text-brand-dark">১৩. বাতিলকরণ, রিফান্ড ও রিটার্ন</h2>
      <p>
        ভেন্ডর প্রস্তুতি শুরু করার আগে আপনি বিনামূল্যে অর্ডার বাতিল করতে পারেন; প্রস্তুতি শুরু হয়ে গেলে বাতিলকরণ
        সম্ভব নাও হতে পারে বা ইতিমধ্যে ব্যবহৃত কাজ/উপকরণের জন্য চার্জ প্রযোজ্য হতে পারে। কোনো পণ্য অনুপস্থিত, ভুল,
        ক্ষতিগ্রস্ত বা বর্ণনার সাথে না মিললে ডেলিভারির যুক্তিসঙ্গত সময়ের মধ্যে সাপোর্টে যোগাযোগ করুন। রিফান্ড
        অনুরোধ কেস-ভিত্তিক পর্যালোচনা করা হয়; অনুমোদিত রিফান্ড আপনার মূল পেমেন্ট পদ্ধতিতে, অথবা ক্যাশ-অন-ডেলিভারি
        অর্ডারের ক্ষেত্রে আমাদের সাপোর্ট টিমের সাথে সম্মত পদ্ধতিতে প্রক্রিয়া করা হয়। বয়স-নিষিদ্ধ পণ্য ডেলিভারির পর
        ফেরত দেওয়া যায় না, তবে পণ্যটি ত্রুটিপূর্ণ হলে বা আপনার অর্ডার করা পণ্য না হলে ব্যতিক্রম প্রযোজ্য।
      </p>

      <h2 className="font-heading text-brand-dark">১৪. রিভিউ ও আপনার জমা দেওয়া কনটেন্ট</h2>
      <p>
        আপনি শুধুমাত্র প্রকৃতপক্ষে দেওয়া অর্ডারের জন্য রিভিউ জমা দিতে পারেন, এবং রিভিউ সৎ, মানহানিকর নয় এবং অবৈধ,
        অপমানজনক বা বিভ্রান্তিকর কনটেন্ট মুক্ত হতে হবে। প্ল্যাটফর্মে রিভিউ, ছবি বা অন্য কনটেন্ট জমা দিয়ে আপনি Pick
        Up-কে এটি প্রদর্শন, পুনরুৎপাদন এবং প্ল্যাটফর্ম পরিচালনা ও প্রচারের সাথে সম্পর্কিত ব্যবহারের জন্য একটি
        অ-একচেটিয়া, রয়্যালটি-মুক্ত, বিশ্বব্যাপী লাইসেন্স প্রদান করেন। এই শর্তাবলী বা প্রযোজ্য আইন লঙ্ঘনকারী কনটেন্ট
        আমরা অপসারণ করতে পারি।
      </p>

      <h2 className="font-heading text-brand-dark">১৫. ভেন্ডর ও রেস্টুরেন্ট শর্তাবলী</h2>
      <p>
        ভেন্ডররা একটি পৃথক ভেন্ডর চুক্তির অধীনে প্ল্যাটফর্মে বিক্রি করেন, যা অনবোর্ডিং অনুমোদন, প্রতিটি অর্ডারে
        প্রযোজ্য কমিশন হার (যা প্রতি ভেন্ডরের জন্য নির্ধারিত এবং তাদের ড্যাশবোর্ডে দেখানো হয়), পেআউট সময়সূচি ও
        পেআউট অনুরোধ, পণ্য-তালিকার মানদণ্ড, অর্ডার-গ্রহণের বাধ্যবাধকতা এবং স্থগিতকরণের কারণ নিয়ন্ত্রণ করে। যা কিছু
        তারা বিক্রি করেন তার খাদ্য-নিরাপত্তা, লাইসেন্স, কর এবং ভোক্তা-আইন মেনে চলার জন্য ভেন্ডররা স্বাধীনভাবে দায়ী,
        এবং প্ল্যাটফর্মে বিক্রির জন্য আবেদনের সময় শুধুমাত্র সঠিক ব্যবসায়িক নথি (যেমন ট্রেড লাইসেন্স ও মালিকানা
        পরিচয়) আপলোড করার জন্যও দায়ী।
      </p>

      <h2 className="font-heading text-brand-dark">১৬. রাইডার শর্তাবলী</h2>
      <p>
        রাইডাররা স্বতন্ত্র ঠিকাদার, Pick Up-এর কর্মচারী বা এজেন্ট নন, এবং তারা সম্পন্ন করা প্রতিটি ডেলিভারির
        ডেলিভারি ফির উপর তাদের ড্যাশবোর্ডে দেখানো হারে কমিশন অর্জন করেন। রাইডাররা নিরাপদে ও বৈধভাবে ডেলিভারি
        সম্পন্ন করা, অর্ডারে বয়স-নিষিদ্ধ পণ্য থাকলে বয়স যাচাই করা, এবং গ্রাহক ও ভেন্ডরদের সাথে উপযুক্ত আচরণ করার
        জন্য দায়ী, যেকোনো রাইডার চুক্তি অনুযায়ী।
      </p>

      <h2 className="font-heading text-brand-dark">১৭. প্ল্যাটফর্মে বিজ্ঞাপন</h2>
      <p>
        ব্যবসাগুলো গ্রাহকদের দেখানো বিজ্ঞাপন প্লেসমেন্ট (যেমন হোমপেজ ব্যানার বা স্পনসরড লিস্টিং) কিনতে পারে, তবে তা
        শিডিউল বা বিল করার আগে আমাদের পর্যালোচনা ও অনুমোদনের সাপেক্ষে। বিজ্ঞাপিত কনটেন্ট বিজ্ঞাপনদাতার দেওয়া,
        &quot;স্পনসরড&quot; বা &quot;বিজ্ঞাপন&quot; হিসেবে চিহ্নিত, এবং Pick Up বিজ্ঞাপিত পণ্য বা দাবি সমর্থন করে না।
        আমরা বয়স-নিষিদ্ধ পণ্যের (যেমন সিগারেট ও ধূমপান সামগ্রী) বা নিচে তালিকাভুক্ত কোনো নিষিদ্ধ পণ্যের প্রচারমূলক
        বিজ্ঞাপন গ্রহণ করি না। বিজ্ঞাপন একটি পৃথক বিজ্ঞাপনদাতা চুক্তির অধীনে পরিচালিত হয়, যা অনুমোদন, মূল্য এবং
        কনটেন্ট মানদণ্ড নিয়ন্ত্রণ করে।
      </p>

      <h2 className="font-heading text-brand-dark">১৮. নিষিদ্ধ পণ্য</h2>
      <p>আপনি প্ল্যাটফর্মের মাধ্যমে নিম্নলিখিত পণ্য তালিকাভুক্ত, বিজ্ঞাপন বা অর্ডার করার চেষ্টা করতে পারবেন না:</p>
      <ul>
        <li>ই-সিগারেট, ভেইপ, হিটেড-টোব্যাকো পণ্য, নিকোটিন পাউচ বা নিকোটিন সল্ট;</li>
        <li>অবৈধ মাদক, নিয়ন্ত্রিত পদার্থ বা মাদক সেবনের সরঞ্জাম;</li>
        <li>আগ্নেয়াস্ত্র, গোলাবারুদ, বিস্ফোরক বা অস্ত্র;</li>
        <li>নকল বা চোরাই পণ্য;</li>
        <li>বাংলাদেশে বিক্রি, রাখা বা ডেলিভারি করা অবৈধ এমন যেকোনো পণ্য, অথবা বয়স-নিষিদ্ধ অথচ ধারা ১০-এ বর্ণিত নিয়ন্ত্রণ ছাড়া বিক্রি করা হচ্ছে এমন পণ্য।</li>
      </ul>
      <p>এই ধারা লঙ্ঘন করা হলে আমরা তালিকা অপসারণ, অর্ডার বাতিল এবং দায়ী অ্যাকাউন্ট স্থগিত করতে পারি।</p>

      <h2 className="font-heading text-brand-dark">১৯. অন্যান্য নিষিদ্ধ আচরণ</h2>
      <p>আপনি আরও সম্মত হচ্ছেন যে আপনি করবেন না:</p>
      <ul>
        <li>কোনো অবৈধ উদ্দেশ্যে বা এই শর্তাবলী লঙ্ঘন করে প্ল্যাটফর্ম ব্যবহার;</li>
        <li>বয়স-যাচাই বা ডেলিভারি-এলাকা নিয়ন্ত্রণ এড়ানোর চেষ্টা;</li>
        <li>মিথ্যা, বিভ্রান্তিকর বা প্রতারণামূলক তথ্য, অর্ডার, রিভিউ বা পেমেন্ট তথ্য জমা দেওয়া;</li>
        <li>স্ক্র্যাপিং, রিভার্স-ইঞ্জিনিয়ারিং বা ক্ষতিকর কোড প্রবেশসহ প্ল্যাটফর্মের নিরাপত্তা বা স্বাভাবিক কার্যক্রমে হস্তক্ষেপ;</li>
        <li>ভেন্ডর, রাইডার বা Pick Up কর্মীদের হয়রানি, হুমকি বা অপব্যবহার।</li>
      </ul>

      <h2 className="font-heading text-brand-dark">২০. মেধাস্বত্ব</h2>
      <p>
        Pick Up নাম, লোগো এবং প্ল্যাটফর্ম ডিজাইন Pick Up-এর মালিকানাধীন এবং আমাদের লিখিত অনুমতি ছাড়া ব্যবহার করা
        যাবে না। ভেন্ডর ও বিজ্ঞাপনদাতার কনটেন্ট তা জমাদানকারী পক্ষের মালিকানাধীন থাকে, তবে প্ল্যাটফর্মে প্রদর্শন ও
        পরিচালনার জন্য Pick Up-কে প্রদত্ত লাইসেন্সের সাপেক্ষে।
      </p>

      <h2 className="font-heading text-brand-dark">২১. দায়মুক্তি ও দায়ের সীমাবদ্ধতা</h2>
      <p>
        প্ল্যাটফর্মটি &quot;যেমন আছে&quot; এবং &quot;যেমন উপলব্ধ&quot; ভিত্তিতে প্রদান করা হয়। আইন দ্বারা অনুমোদিত
        সর্বোচ্চ পরিমাণে, Pick Up প্ল্যাটফর্ম এবং এর মাধ্যমে প্রদত্ত পণ্য বা সেবা সম্পর্কিত সকল ওয়ারেন্টি অস্বীকার
        করে, এবং প্ল্যাটফর্ম ব্যবহার, ডেলিভারিতে বিলম্ব বা ব্যর্থতা, অথবা স্বতন্ত্র ভেন্ডর বা রাইডারের কাজ বা
        ত্রুটির কারণে উদ্ভূত পরোক্ষ, আনুষঙ্গিক বা ফলস্বরূপ ক্ষতির জন্য দায়ী নয়। প্রযোজ্য আইনের অধীনে সীমাবদ্ধ করা
        যায় না এমন দায়, যেমন মৃত্যু, ব্যক্তিগত আঘাত বা প্রতারণার ক্ষেত্রে, এই শর্তাবলীর কিছুই তা সীমিত করে না।
      </p>

      <h2 className="font-heading text-brand-dark">২২. ক্ষতিপূরণ</h2>
      <p>
        এই শর্তাবলী লঙ্ঘন, প্ল্যাটফর্মের অপব্যবহার, বা প্রযোজ্য আইন লঙ্ঘনের কারণে উদ্ভূত দাবি, ক্ষতি ও ব্যয় (যুক্তিসঙ্গত
        আইনি ফি সহ) থেকে Pick Up-কে ক্ষতিপূরণ দিতে ও নিরাপদ রাখতে আপনি সম্মত।
      </p>

      <h2 className="font-heading text-brand-dark">২৩. প্রযোজ্য আইন ও বিরোধ</h2>
      <p>
        এই শর্তাবলী বাংলাদেশের আইন দ্বারা নিয়ন্ত্রিত। এই শর্তাবলী বা প্ল্যাটফর্ম ব্যবহার থেকে উদ্ভূত যেকোনো বিরোধ
        প্রথমে Pick Up কাস্টমার সাপোর্টের মাধ্যমে সমাধানের চেষ্টা করা হবে; সমাধান না হলে, বাধ্যতামূলক ভোক্তা-সুরক্ষা
        আইনের অধীনে আপনার কোনো অধিকারের ক্ষতি না করে, বিরোধ বাংলাদেশের আদালতের একচেটিয়া এখতিয়ারের অধীন থাকবে।
      </p>

      <h2 className="font-heading text-brand-dark">২৪. শর্তাবলীর পরিবর্তন</h2>
      <p>
        প্ল্যাটফর্ম বা প্রযোজ্য আইনের পরিবর্তন প্রতিফলিত করতে আমরা মাঝে মাঝে এই শর্তাবলী হালনাগাদ করতে পারি। নতুন
        &quot;সর্বশেষ হালনাগাদ&quot; তারিখসহ হালনাগাদ শর্তাবলী প্রকাশ করা হবে, এবং গুরুত্বপূর্ণ পরিবর্তন প্ল্যাটফর্মে
        হাইলাইট করা হবে। পরিবর্তন কার্যকর হওয়ার পর Pick Up ব্যবহার চালিয়ে যাওয়া মানে আপনি হালনাগাদ শর্তাবলী মেনে
        নিচ্ছেন।
      </p>

      <h2 className="font-heading text-brand-dark">২৫. যোগাযোগ করুন</h2>
      <p>
        এই শর্তাবলী সম্পর্কে প্রশ্ন সাপোর্ট পেজের মাধ্যমে, ইমেইলে{" "}
        <a href="mailto:information@pickupn.com">information@pickupn.com</a>, অথবা ফোনে{" "}
        <a href="tel:+8801310790678">+8801310790678</a> নম্বরে পাঠাতে পারেন।
      </p>
    </>
  );
}
